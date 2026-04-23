import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../config/db';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';
import { interceptAction } from '../middleware/interceptor';

const MAX_SCAN_ITEMS = 100;
const COST_PER_S3_GET = 0.0000004; // AWS approximate cost per GET request

export async function processS3Scan(connectorId: string) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector || connector.type !== 's3') throw new Error(`Invalid S3 connector: ${connectorId}`);

  const config = connector.config as any;
  const scope = (connector.scope as any) || {};
  const lastScanAt = connector.last_scan_at ? new Date(connector.last_scan_at) : new Date(0);

  // Decrypt credentials if they are stored in the secure format (iv:tag:encrypted)
  const accessKeyId = config.accessKeyId?.includes(':') ? decrypt(config.accessKeyId) : config.accessKeyId;
  const secretAccessKey = config.secretAccessKey?.includes(':') ? decrypt(config.secretAccessKey) : config.secretAccessKey;

  const s3 = new S3Client({
    region: config.region || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
  });

  const buckets = scope.buckets && scope.buckets.length > 0 ? scope.buckets : [config.bucket];
  
  let apiCalls = 0;
  let bytesScanned = BigInt(0);
  let totalItemsScanned = 0;
  let totalViolations = 0;

  for (const bucket of buckets) {
    if (totalItemsScanned >= MAX_SCAN_ITEMS) break;

    const listCommand = new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 100 });
    const objects = await s3.send(listCommand);
    apiCalls++;

    if (!objects.Contents) continue;

    for (const obj of objects.Contents) {
      if (totalItemsScanned >= MAX_SCAN_ITEMS) break;
      if (!obj.Key || obj.Size === 0) continue;

      // Incremental + Scope check
      if (obj.LastModified && obj.LastModified <= lastScanAt) continue;
      const extension = obj.Key.split('.').pop()?.toLowerCase() || '';
      if (scope.fileTypes && !scope.fileTypes.includes(extension)) continue;

      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: obj.Key });
      const response = await s3.send(getCommand);
      apiCalls++;
      
      const content = await response.Body?.transformToString();
      if (content) {
        const findings = await scanContent(content, obj.Key, connector.organizationId);
        totalViolations += findings.length;
        totalItemsScanned++;
        bytesScanned += BigInt(Buffer.byteLength(content));
      }
    }
  }

  // Calculate Scan Confidence
  // High = complete scan, Medium = hits limit, Low = very partial
  let scanConfidence = 0.95;
  if (totalItemsScanned >= MAX_SCAN_ITEMS) scanConfidence = 0.75;
  if (totalItemsScanned < 5) scanConfidence = 0.50;

  const scanCost = (apiCalls * COST_PER_S3_GET);

  // Update Telemetry & Budget Accumulator
  await prisma.connectors.update({
    where: { id: connectorId },
    data: {
      last_scan_at: new Date().toISOString(),
      status: totalItemsScanned >= MAX_SCAN_ITEMS ? 'active_partial' : 'active',
      total_api_calls: connector.total_api_calls + apiCalls,
      total_data_scanned: connector.total_data_scanned + bytesScanned,
      estimated_cost: connector.estimated_cost + scanCost,
      daily_cost_total: connector.daily_cost_total + scanCost,
      last_confidence: scanConfidence
    }
  });

  // Adaptive logic: If violations spike, escalate priority
  if (totalViolations > 5 && connector.priority !== 'high') {
     await prisma.connectors.update({ where: { id: connectorId }, data: { priority: 'high' } });
  }
}

async function scanContent(content: string, fileName: string, organizationId: string) {
  const findings: any[] = [];
  const patterns = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    HEALTH_KEYWORD: /\b(patient|diagnosis|treatment|prescription|medical record)\b/gi
  };

  for (const [type, regex] of Object.entries(patterns)) {
    const matches = content.match(regex);
    if (matches && matches.length > 0) findings.push({ type, count: matches.length });
  }

  if (findings.length > 0) {
    await interceptAction({
      agent: 'S3-Scanner',
      action: 'DATA_DISCOVERY_VIOLATION',
      organizationId,
      metadata: { source: 's3', file: fileName, findings, risk: 'high' }
    }, async () => ({}));
  }
  return findings;
}
