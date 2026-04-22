import { google } from 'googleapis';
import prisma from '../config/db';
import logger from '../utils/logger';
import { interceptAction } from '../middleware/interceptor';

const MAX_DRIVE_FILES = 50;
const COST_PER_DRIVE_API = 0.0005; // Google API cost estimate

export async function processGDriveScan(connectorId: string) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector || connector.type !== 'gdrive') throw new Error(`Invalid GDrive connector: ${connectorId}`);

  const config = connector.config as any;
  const scope = (connector.scope as any) || {};
  const lastScanAt = connector.last_scan_at ? new Date(connector.last_scan_at) : new Date(0);
  
  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret);
  auth.setCredentials({ refresh_token: config.refreshToken });
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

    // Adaptive: If violations found, boost priority
    if (violations > 0 && connector.priority !== 'high') {
       await prisma.connectors.update({ where: { id: connectorId }, data: { priority: 'high' } });
    }

  } catch (error) {
    logger.error(`GDrive Scan failed:`, error);
    await prisma.connectors.update({ where: { id: connectorId }, data: { status: 'failed' } });
  }
}
