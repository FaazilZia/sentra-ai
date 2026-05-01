import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { enqueueConnectorScan } from '../services/queue.service';

export const listConnectors = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(200).json({ success: true, data: { items: [] } });
    }

    const rows = await prisma.connectors.findMany({
      where: { organizationId: organizationId },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { items: rows } });
  } catch (error) {
    next(error);
  }
};

export const getExecutiveOverview = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const connectors = await prisma.connectors.findMany({
      where: { organizationId }
    });

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incidents = await prisma.logs.count({
      where: { organizationId, timestamp: { gte: last24h }, status: 'blocked' }
    });

    const totalBudgetUsed = connectors.reduce((acc, c) => acc + (c.daily_cost_total || 0), 0);
    const totalDailyLimit = connectors.length > 0 
      ? connectors.reduce((acc, c) => acc + ((c.scan_policy as any)?.maxDailyCost || 5.0), 0)
      : 100.0; // Default base budget for platform visibility
    
    const scansLast24h = connectors.reduce((acc, c) => acc + (c.daily_scan_count || 0), 0);
    const activeConnectors = connectors.filter(c => c.status === 'active' || c.status === 'active_partial').length;
    
    const avgHealth = connectors.length > 0 
      ? Math.round(connectors.reduce((acc, c) => acc + (c.health_score || 0), 0) / connectors.length)
      : 100;

    // Determine System Mode
    let systemMode = 'autonomous';
    if (connectors.some(c => c.status === 'paused_budget')) systemMode = 'restricted';
    if (connectors.some(c => c.priority === 'high')) systemMode = 'high_alert';

    res.status(200).json({
      success: true,
      data: {
        systemMode,
        auditSummary: {
          scansLast24h,
          violationsDetected: incidents,
          budgetUsed: totalBudgetUsed,
          budgetLimit: totalDailyLimit,
          activeConnectors,
          healthScore: avgHealth
        },
        controls: {
          scanningMode: 'auto',
          authority: req.user?.role === 'ADMIN' ? 'full' : 'limited'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createConnector = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const { name, type, config, scope } = req.body as {
      name: string;
      type: 'sql' | 'gdrive' | 's3' | 'local';
      config?: Record<string, unknown>;
      scope?: Record<string, unknown>;
    };

    const row = await prisma.connectors.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: organizationId,
        name,
        type,
        config: (config || {}) as object,
        scope: (scope || {}) as object,
        status: 'pending',
        last_scan_at: null,
      },
    });

    // Trigger immediate scan
    await enqueueConnectorScan(type, row.id);

    res.status(201).json({
      success: true,
      data: row,
    });
  } catch (error) {
    next(error);
  }
};
