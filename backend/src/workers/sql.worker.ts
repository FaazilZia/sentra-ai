import { Client } from 'pg';
import prisma from '../config/db';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';
import { interceptAction } from '../middleware/interceptor';

const MAX_ROWS_PER_TABLE = 50;
const COST_PER_QUERY = 0.0001; // Internal resource cost estimate

export async function processSqlScan(connectorId: string) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector || connector.type !== 'sql') throw new Error(`Invalid SQL connector: ${connectorId}`);

  const config = connector.config as any;
  const scope = (connector.scope as any) || {};
  const lastScanAt = connector.last_scan_at ? new Date(connector.last_scan_at) : new Date(0);

  // Decrypt connection string if stored in secure format
  const connectionString = config.connectionString?.includes(':') ? decrypt(config.connectionString) : config.connectionString;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  let apiCalls = 0;
  let totalViolations = 0;
  let tablesScanned = 0;

  try {
    await client.connect();
    apiCalls++;

    const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    apiCalls++;

    const allTables = tablesRes.rows.map(r => r.table_name);
    const tablesToScan = scope.tables && scope.tables.length > 0 
      ? allTables.filter(t => scope.tables.includes(t))
      : allTables.slice(0, 5);

    for (const tableName of tablesToScan) {
      const colCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'updated_at'`, [tableName]);
      apiCalls++;

      let query = `SELECT * FROM "${tableName}"`;
      if (colCheck.rows.length > 0) query += ` WHERE updated_at > $1`;
      query += ` ORDER BY 1 DESC LIMIT ${MAX_ROWS_PER_TABLE}`;

      const sampleRes = await client.query(query, colCheck.rows.length > 0 ? [lastScanAt] : []);
      apiCalls++;
      
      if (sampleRes.rows.length > 0) {
        const findings = await scanRows(sampleRes.rows, tableName, connector.organizationId);
        totalViolations += findings.length;
        tablesScanned++;
      }
    }

    const scanConfidence = tablesScanned === tablesToScan.length ? 0.98 : 0.70;
    const scanCost = (apiCalls * COST_PER_QUERY);

    await prisma.connectors.update({
      where: { id: connectorId },
      data: {
        last_scan_at: new Date().toISOString(),
        status: 'active',
        total_api_calls: connector.total_api_calls + apiCalls,
        estimated_cost: connector.estimated_cost + scanCost,
        daily_cost_total: connector.daily_cost_total + scanCost,
        last_confidence: scanConfidence
      }
    });

  } catch (error) {
    logger.error(`SQL Scan failed for ${connectorId}:`, error);
    await prisma.connectors.update({ where: { id: connectorId }, data: { status: 'failed' } });
    throw error;
  } finally {
    await client.end();
  }
}

async function scanRows(rows: any[], tableName: string, organizationId: string) {
  const findings: any[] = [];
  const sensitiveColumns = ['email', 'phone', 'ssn', 'password', 'credit_card', 'cc_num', 'salary'];
  
  const columns = Object.keys(rows[0]);
  const flaggedCols = columns.filter(col => sensitiveColumns.some(s => col.toLowerCase().includes(s)));

  if (flaggedCols.length > 0) {
    findings.push({ type: 'SENSITIVE_COLUMN_DETECTED', columns: flaggedCols });
  }

  // Row content scan
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let piiMatchCount = 0;
  for (const row of rows) {
    const rowStr = JSON.stringify(row);
    if (emailRegex.test(rowStr)) piiMatchCount++;
  }
  if (piiMatchCount > 0) {
    findings.push({ type: 'PII_CONTENT_MATCH', count: piiMatchCount });
  }

  if (findings.length > 0) {
    await interceptAction({
      agent: 'SQL-Scanner-Worker',
      action: 'DB_COMPLIANCE_VIOLATION',
      organizationId,
      metadata: { source: 'sql', table: tableName, findings, risk: 'high' }
    }, async () => ({ message: "DB Compliance finding logged" }));
  }
  return findings;
}
