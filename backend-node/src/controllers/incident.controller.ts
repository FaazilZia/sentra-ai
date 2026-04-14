import { Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getIncidents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const limitParam = req.query['limit'];
    const take = limitParam ? parseInt(String(limitParam), 10) : 50;
    const statusParam = req.query['status'];
    const status = statusParam ? String(statusParam) : undefined;

    const incidents = await prisma.incidents.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      take,
    });

    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    next(error);
  }
};

export const getIncidentById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id'] ?? '');
    const incident = await prisma.incidents.findUnique({ where: { id } });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

export const updateIncidentStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id'] ?? '');
    const { status } = req.body as { status: string };

    const updatedIncident = await prisma.incidents.update({
      where: { id },
      data: { status: status.toLowerCase() },
    });

    res.status(200).json({
      success: true,
      message: `Incident status updated to ${status}`,
      data: updatedIncident,
    });
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

    const newIncident = await prisma.incidents.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: req.user?.tenant_id || '00000000-0000-0000-0000-000000000001',
        agent_id,
        action,
        severity,
        policy_id,
        details,
        prompt_excerpt,
        response_excerpt,
        event_metadata: metadata || {},
        status: 'unresolved'
      }
    });

    res.status(201).json({ success: true, id: newIncident.id, data: newIncident });
  } catch (error) {
    next(error);
  }
};

// Global scan state simulation
let scanProgress = 0;
let isScanning = false;

export const triggerScan = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (isScanning) {
      return res.status(400).json({ success: false, message: 'Scan already in progress' });
    }

    isScanning = true;
    scanProgress = 0;

    // Simulate scan progression
    const interval = setInterval(() => {
      scanProgress += 20;
      if (scanProgress >= 100) {
        clearInterval(interval);
        isScanning = false;
      }
    }, 1000);

    res.status(202).json({ success: true, message: 'Scan initiated' });
  } catch (error) {
    next(error);
  }
};

export const getScanStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      status: scanProgress >= 100 ? 'SUCCESS' : 'PROCESSING',
      progress: scanProgress,
      result: scanProgress >= 100 ? { incidents_detected: 4, sources_scanned: 12 } : null
    });
  } catch (error) {
    next(error);
  }
};
