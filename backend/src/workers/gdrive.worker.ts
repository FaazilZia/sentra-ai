import { google } from 'googleapis';
import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';
import { interceptAction } from '../middleware/interceptor';
import { updateConnectorTelemetry } from './worker.manager';

export class GDriveGovernanceConnector {
  private organizationId: string;
  private agentName: string;

  constructor(organizationId: string, agentName: string = 'gdrive-connector') {
    this.organizationId = organizationId;
    this.agentName = agentName;
  }

  private async governanceCheck(action: string, metadata: Record<string, any>): Promise<void> {
    const decision = await makeDecision(this.agentName, action, this.organizationId, metadata);

    await prisma.interception_logs.create({
      data: {
        user_id: `gdrive_${this.agentName}`,
        organizationId: this.organizationId,
        input_text: JSON.stringify(metadata),
        decision: decision.status === 'blocked' ? 'BLOCK' : 'ALLOW',
        confidence: 'High',
        reason: decision.reason,
        policy_triggered: decision.compliance.join(', ') || 'GDrive Baseline Policy',
        metadata: { action, riskLevel: decision.risk, ...metadata },
        timestamp: new Date(),
      },
    });

    if (decision.status === 'blocked') {
      throw new Error(`GDrive action blocked by Sentraa governance: ${decision.reason}`);
    }
  }

  private getDriveClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth });
  }

  async listFiles(accessToken: string, query?: string): Promise<any[]> {
    await this.governanceCheck('gdrive_list_files', { query: query || 'all' });
    const drive = this.getDriveClient(accessToken);
    const response = await drive.files.list({
      q: query,
      pageSize: 20,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
    });
    logger.info(`[GDrive Governance] Listed ${response.data.files?.length || 0} files`);
    return response.data.files || [];
  }

  async readFile(accessToken: string, fileId: string, fileName: string): Promise<string> {
    await this.governanceCheck('gdrive_read_file', { fileId, fileName });
    const drive = this.getDriveClient(accessToken);
    const response = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'stream' }
    );
    return new Promise((resolve, reject) => {
      let content = '';
      (response.data as any).on('data', (chunk: Buffer) => { content += chunk.toString(); });
      (response.data as any).on('end', () => resolve(content));
      (response.data as any).on('error', reject);
    });
  }
}

const MAX_DRIVE_FILES = 50;
const COST_PER_DRIVE_API = 0.0005; // Google API cost estimate

export async function processGDriveScan(connectorId: string) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector || connector.type !== 'gdrive') throw new Error(`Invalid GDrive connector: ${connectorId}`);

  const config = connector.config as any;
  const scope = (connector.scope as any) || {};
  const lastScanAt = connector.last_scan_at ? new Date(connector.last_scan_at) : new Date(0);
  
  // Decrypt refresh token if stored in secure format
  const refreshToken = config.refreshToken?.includes(':') ? decrypt(config.refreshToken) : config.refreshToken;

  const auth = new google.auth.OAuth2(
    config.clientId || process.env.GOOGLE_CLIENT_ID,
    config.clientSecret || process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth });

  let apiCalls = 0;
  let violations = 0;

  try {
    let q = `modifiedTime > '${lastScanAt.toISOString()}'`;
    if (scope.folders && scope.folders.length > 0) {
      const folderQuery = scope.folders.map((f: string) => `'${f}' in parents`).join(' or ');
      q += ` and (${folderQuery})`;
    }

    const res = await drive.files.list({
      pageSize: MAX_DRIVE_FILES,
      q,
      fields: 'nextPageToken, files(id, name, mimeType, permissions, modifiedTime)',
    });
    apiCalls++;

    const files = res.data.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const isPublic = file.permissions?.some(p => p.type === 'anyone');
      if (isPublic) {
        violations++;
        await interceptAction({
          agent: 'GDrive-Auditor',
          action: 'PUBLIC_FILE_EXPOSURE',
          organizationId: connector.organizationId,
          metadata: { source: 'gdrive', fileName: file.name, risk: 'high' }
        }, async () => ({}));
      }
    }

    const scanConfidence = files.length < MAX_DRIVE_FILES ? 0.99 : 0.80;
    const scanCost = (apiCalls * COST_PER_DRIVE_API);

    await updateConnectorTelemetry(connectorId, apiCalls, scanCost, scanConfidence, 'active');

    // Adaptive: If violations found, boost priority
    if (violations > 0 && connector.priority !== 'high') {
       await prisma.connectors.update({ where: { id: connectorId }, data: { priority: 'high' } });
    }

  } catch (error) {
    logger.error(`GDrive Scan failed:`, error);
    await prisma.connectors.update({ where: { id: connectorId }, data: { status: 'failed' } });
  }
}
