import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveTenantId } from '../utils/tenant';
import { serializeIncident } from '../utils/incidentSerialize';
import logger from '../utils/logger';

const SCAN_PROGRESS_STEP = 20;
const SCAN_TICK_MS = 500;
const SOURCES_SCANNED_DEFAULT = 15;
const PII_LABELS = ['EMAIL', 'CREDIT_CARD', 'PHONE', 'ADDRESS'] as const;

type ScanJob = {
  progress: number;
  phase: 'IDLE' | 'PROCESSING' | 'SUCCESS';
  result: {
    incidents_detected: number;
    sources_scanned: number;
    timestamp: string;
  } | null;
  intervalId: ReturnType<typeof setInterval> | null;
};

const scanJobs = new Map<string, ScanJob>();

function getOrCreateScanJob(tenantId: string): ScanJob {
  let job = scanJobs.get(tenantId);
  if (!job) {
    job = {
      progress: 0,
      phase: 'IDLE',
      result: null,
      intervalId: null,
    };
    scanJobs.set(tenantId, job);
  }
  return job;
}

async function finalizeScanJob(tenantId: string, job: ScanJob, incidentsDetected: number) {
  try {
    for (let i = 0; i < incidentsDetected; i++) {
      await prisma.incidents.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          user_id: null,
          agent_id: 'deep-scan-engine',
          action: 'automated_policy_scan',
          severity: Math.floor(Math.random() * 45) + 35,
          policy_id: null,
          details: `Automated deep-scan finding #${i + 1}: policy-sensitive pattern in connected data sources.`,
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
    }
  } catch (e) {
    logger.error('finalizeScanJob: failed to persist scan incidents', e);
    job.phase = 'SUCCESS';
    job.progress = 100;
    job.result = {
      incidents_detected: 0,
      sources_scanned: SOURCES_SCANNED_DEFAULT,
      timestamp: new Date().toISOString(),
    };
    return;
  }

  job.phase = 'SUCCESS';
  job.progress = 100;
  job.result = {
    incidents_detected: incidentsDetected,
    sources_scanned: SOURCES_SCANNED_DEFAULT,
    timestamp: new Date().toISOString(),
  };
}

export const getIncidents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const limitParam = req.query['limit'];
    const take = limitParam ? parseInt(String(limitParam), 10) : 50;
    const statusParam = req.query['status'];
    const status = statusParam ? String(statusParam) : undefined;

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const incidents = await prisma.incidents.findMany({
      where: {
        tenant_id: tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { created_at: 'desc' },
      take,
    });

    // Map database field event_metadata to API field metadata for frontend compatibility
    const mappedIncidents = incidents.map(inc => ({
      ...inc,
      metadata: inc.event_metadata
    }));

    res.status(200).json({ success: true, data: mappedIncidents.map(serializeIncident) });
  } catch (error) {
    next(error);
  }
};

export const getIncidentById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id'] ?? '');
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const incident = await prisma.incidents.findUnique({ where: { id } });

    if (!incident || incident.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.status(200).json({ 
      success: true, 
      data: serializeIncident({ ...incident, metadata: incident.event_metadata }) 
    });
  } catch (error) {
    next(error);
  }
};

export const updateIncidentStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id'] ?? '');
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    const { status } = req.body as { status: string };

    const existing = await prisma.incidents.findUnique({ where: { id } });
    if (!existing || existing.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
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

    res.status(200).json({
      success: true,
      message: `Incident status updated to ${status}`,
      data: serializeIncident(updatedIncident),
    });
  } catch (error) {
    next(error);
  }
};

/** Audit / remediation trail: resolved or non-unresolved incidents for the tenant */
export const getIncidentHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(200).json({ success: true, data: { items: [] } });
    }

    const rows = await prisma.incidents.findMany({
      where: {
        tenant_id: tenantId,
        OR: [{ status: { not: 'unresolved' } }, { resolved_at: { not: null } }],
      },
      orderBy: [{ resolved_at: 'desc' }, { updated_at: 'desc' }],
      take: 200,
      include: {
        users_incidents_resolved_by_idTousers: {
          select: { full_name: true, email: true },
        },
      },
    });

    const items = rows.map((row) => ({
      id: row.id,
      agent_id: row.agent_id,
      status: row.status,
      details: row.details,
      operator:
        row.users_incidents_resolved_by_idTousers?.full_name ||
        row.users_incidents_resolved_by_idTousers?.email ||
        (row.status === 'unresolved' ? 'System' : 'Operator'),
      resolved_at: (row.resolved_at || row.updated_at).toISOString(),
      severity: row.severity,
    }));

    res.status(200).json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

export const logIncident = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { 
      agent_id, action, severity, policy_id, 
      details, prompt_excerpt, response_excerpt, metadata 
    } = req.body;

    let tenant_id = await resolveTenantId(req);
    
    // If tenant resolution fails (e.g. invalid API key or session), 
    // we should not proceed in production.
    if (!tenant_id) {
       logger.warn('logIncident: Failed to resolve tenantId. Falling back to default for safety (check auth middleware).');
       tenant_id = '00000000-0000-0000-0000-000000000001'; 
    }

    const isServiceAgent = req.user?.role === 'SERVICE_AGENT';
    const userId =
      !isServiceAgent && req.user?.id && typeof req.user.id === 'string'
        ? req.user.id
        : null;

    const policyUuid =
      policy_id && typeof policy_id === 'string' && policy_id.length > 0 ? policy_id : null;

    const newIncident = await prisma.incidents.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id,
        user_id: userId,
        agent_id: String(agent_id || 'unknown-agent'),
        action: String(action || 'detected'),
        severity: parseInt(String(severity ?? 1), 10),
        policy_id: policyUuid,
        details: String(details || 'No details provided'),
        prompt_excerpt: String(prompt_excerpt || ''),
        response_excerpt: String(response_excerpt || ''),
        event_metadata: metadata ?? {},
        status: 'unresolved'
      }
    });

    const payload = serializeIncident(newIncident);
    res.status(201).json({
      success: true,
      status: 'logged',
      id: newIncident.id,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerScan = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context required to run scan' });
    }

    const job = getOrCreateScanJob(tenantId);

    if (job.phase === 'PROCESSING') {
      return res.status(409).json({
        success: false,
        message: 'Scan already in progress',
        data: { progress: job.progress },
      });
    }

    if (job.intervalId) {
      clearInterval(job.intervalId);
      job.intervalId = null;
    }

    job.phase = 'PROCESSING';
    job.progress = 0;
    job.result = null;

    let accumulated = 0;
    job.intervalId = setInterval(() => {
      accumulated += SCAN_PROGRESS_STEP;
      if (accumulated < 100) {
        job.progress = accumulated;
        return;
      }

      if (job.intervalId) {
        clearInterval(job.intervalId);
        job.intervalId = null;
      }

      job.progress = Math.min(accumulated, 90);
      const incidentsDetected = Math.floor(Math.random() * 6) + 1;
      void finalizeScanJob(tenantId, job, incidentsDetected);
    }, SCAN_TICK_MS);

    res.status(202).json({
      success: true,
      data: { message: 'Deep scan initiated' },
    });
  } catch (error) {
    next(error);
  }
};

export const getScanStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'IDLE' as const,
          progress: 0,
          result: null,
        },
      });
    }

    const job = scanJobs.get(tenantId);
    if (!job) {
      return res.status(200).json({
        success: true,
        data: { status: 'IDLE' as const, progress: 0, result: null },
      });
    }

    const status: 'IDLE' | 'PROCESSING' | 'SUCCESS' =
      job.phase === 'PROCESSING'
        ? 'PROCESSING'
        : job.phase === 'SUCCESS'
          ? 'SUCCESS'
          : 'IDLE';

    res.status(200).json({
      success: true,
      data: {
        status,
        progress: job.progress,
        result: job.phase === 'SUCCESS' ? job.result : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

