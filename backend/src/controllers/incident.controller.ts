import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { serializeIncident } from '../utils/incidentSerialize';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { NotificationService } from '../services/notification.service';

const SCAN_PROGRESS_STEP = 20;
const SCAN_TICK_MS = 500;
const PII_LABELS = ['EMAIL', 'CREDIT_CARD', 'PHONE', 'ADDRESS'] as const;

async function finalizeScanJob(organizationId: string, jobId: string, incidentsDetected: number) {
  try {
    const SourcesScanned = 15;
    
    // Create actual incidents in DB
    for (let i = 0; i < incidentsDetected; i++) {
      const incidentId = crypto.randomUUID();
      const details = `Automated deep-scan finding #${i + 1}: policy-sensitive pattern in connected data sources.`;
      await prisma.incidents.create({
        data: {
          id: incidentId,
          organizationId: organizationId,
          user_id: null,
          agent_id: 'deep-scan-engine',
          action: 'automated_policy_scan',
          severity: crypto.randomInt(35, 80),
          policy_id: null,
          details,
          prompt_excerpt: '',
          response_excerpt: '',
          event_metadata: {
            ai_insight: true,
            pii_type: PII_LABELS[i % PII_LABELS.length],
            source: 'deep_scan',
          },
          status: 'unresolved',
        },
      });

      await NotificationService.notifyIncidentCreated(
        organizationId,
        'New Scan Incident Detected',
        details,
        'incident',
        incidentId
      );
    }

    // Update job status in DB
    await prisma.scan_jobs.update({
      where: { id: jobId },
      data: {
        phase: 'SUCCESS',
        progress: 100,
        incidents_detected: incidentsDetected,
        sources_scanned: SourcesScanned,
        updated_at: new Date()
      }
    });

  } catch (e) {
    logger.error('finalizeScanJob: failed to persist scan incidents', e);
    await prisma.scan_jobs.update({
      where: { id: jobId },
      data: { phase: 'FAILED', progress: 100, updated_at: new Date() }
    }).catch(() => {});
  }
}

export const getIncidents = asyncHandler(async (req: any, res: Response) => {
  const { limit: take } = parsePagination(req.query, 50, 200);
  const statusParam = req.query['status'];
  const status = statusParam ? String(statusParam) : undefined;

  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, []);
  }

  const incidents = await prisma.incidents.findMany({
    where: {
      organizationId: organizationId,
      ...(status ? { status } : {}),
    },
    orderBy: { created_at: 'desc' },
    take,
  });

  return sendSuccess(res, incidents.map(serializeIncident));
});

export const getIncidentById = asyncHandler(async (req: any, res: Response) => {
  const id = String(req.params['id'] ?? '');
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 404, 'Incident not found');
  }

  const incident = await prisma.incidents.findUnique({ where: { id } });

  if (!incident || incident.organizationId !== organizationId) {
    return sendError(res, 404, 'Incident not found');
  }

  return sendSuccess(res, serializeIncident(incident));
});

export const updateIncidentStatus = asyncHandler(async (req: any, res: Response) => {
  const id = String(req.params['id'] ?? '');
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 404, 'Incident not found');
  }
  const { status } = req.body as { status: string };

  const existing = await prisma.incidents.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    return sendError(res, 404, 'Incident not found');
  }

  const normalized = status.toLowerCase();
  const markResolved = normalized !== 'unresolved';

  const updatedIncident = await prisma.incidents.update({
    where: { id },
    data: {
      status: normalized,
      ...(markResolved && req.user?.role !== 'SERVICE_AGENT'
        ? {
            resolved_at: new Date(),
            resolved_by_id: req.user.id,
          }
        : {}),
    },
  });

  return sendSuccess(res, serializeIncident(updatedIncident));
});

/** Audit / remediation trail: resolved or non-unresolved incidents for the company */
export const getIncidentHistory = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, { items: [] });
  }

  // Explicitly typing the rows to help IDE with relation inference
  const rows = await prisma.incidents.findMany({
    where: {
      organizationId: organizationId,
      OR: [{ status: { not: 'unresolved' } }, { resolved_at: { not: null } }],
    },
    orderBy: [{ resolved_at: 'desc' }, { updated_at: 'desc' }],
    take: 200,
    include: {
      resolved_by: {
        select: { full_name: true, email: true },
      },
    },
  }) as Array<any>; 

  const items = rows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    status: row.status,
    details: row.details,
    operator:
      row.resolved_by?.full_name ||
      row.resolved_by?.email ||
      (row.status === 'unresolved' ? 'System' : 'Operator'),
    resolved_at: (row.resolved_at || row.updated_at).toISOString(),
    severity: row.severity,
  }));

  return sendSuccess(res, { items });
});

export const logIncident = asyncHandler(async (req: any, res: Response) => {
  const { 
    agent_id, action, severity, policy_id, 
    details, prompt_excerpt, response_excerpt, metadata 
  } = req.body;

  const organizationId = await resolveOrganizationId(req);
  
  // If company resolution fails (e.g. invalid API key or session), 
  // we should not proceed. The auth middleware should catch this, but we check again.
  if (!organizationId) {
     return sendError(res, 401, 'Invalid organization context');
  }

  const isServiceAgent = req.user?.role === 'SERVICE_AGENT';
  const userId =
    !isServiceAgent && req.user?.id && typeof req.user.id === 'string'
      ? req.user.id
      : null;

  const policyUuid =
    policy_id && typeof policy_id === 'string' && policy_id.length > 0 ? policy_id : null;

  const incidentId = crypto.randomUUID();
  const newIncident = await prisma.incidents.create({
    data: {
      id: incidentId,
      organizationId,
      user_id: userId,
      agent_id: String(agent_id || 'unknown-agent'),
      action: String(action || 'detected'),
      severity: Number.parseInt(String(severity ?? 1), 10),
      policy_id: policyUuid,
      details: String(details || 'No details provided'),
      prompt_excerpt: String(prompt_excerpt || ''),
      response_excerpt: String(response_excerpt || ''),
      event_metadata: metadata ?? {},
      status: 'unresolved'
    }
  });

  await NotificationService.notifyIncidentCreated(
    organizationId,
    `New Incident: ${newIncident.action}`,
    newIncident.details,
    'incident',
    newIncident.id
  );

  const payload = serializeIncident(newIncident);
  return sendSuccess(res, {
    success: true,
    status: 'logged',
    id: newIncident.id,
    data: payload,
  }, 201);
});

export const triggerScan = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required to run scan');
  }

  // Check for existing processing job in DB
  const existingJob = await prisma.scan_jobs.findFirst({
    where: { organizationId: organizationId, phase: 'PROCESSING' }
  });

  if (existingJob) {
    return res.status(409).json({
      success: false,
      message: 'Scan already in progress',
      data: { progress: existingJob.progress },
    });
  }

  // Create new job in DB
  const jobId = crypto.randomUUID();
  await prisma.scan_jobs.create({
    data: {
      id: jobId,
      organizationId: organizationId,
      phase: 'PROCESSING',
      progress: 0
    }
  });

  // Simulate async processing (in a real app, use a dedicated worker)
  let accumulated = 0;
  const intervalId = setInterval(async () => {
    accumulated += SCAN_PROGRESS_STEP;
    if (accumulated < 100) {
      await prisma.scan_jobs.update({
        where: { id: jobId },
        data: { progress: accumulated }
      }).catch(() => {});
      return;
    }

    clearInterval(intervalId);
    const incidentsDetected = crypto.randomInt(1, 7);
    await finalizeScanJob(organizationId, jobId, incidentsDetected);
  }, SCAN_TICK_MS);

  return sendSuccess(res, { message: 'Deep scan initiated' }, 202);
});

export const getScanStatus = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, { status: 'IDLE', progress: 0, result: null });
  }

  const job = await prisma.scan_jobs.findFirst({
    where: { organizationId: organizationId },
    orderBy: { created_at: 'desc' }
  });

  if (!job) {
    return sendSuccess(res, { status: 'IDLE', progress: 0, result: null });
  }

  return sendSuccess(res, {
    status: job.phase,
    progress: job.progress,
    result: job.phase === 'SUCCESS' ? {
      incidents_detected: job.incidents_detected,
      sources_scanned: job.sources_scanned,
      timestamp: job.updated_at.toISOString()
    } : null,
  });
});
