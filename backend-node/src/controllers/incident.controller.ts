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

export const resolveIncident = async (req: any, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id'] ?? '');
    const { status } = req.body as { status?: string };

    const updatedIncident = await prisma.incidents.update({
      where: { id },
      data: { status: status || 'resolved' },
    });

    res.status(200).json({
      success: true,
      message: 'Incident resolved successfully',
      data: updatedIncident,
    });
  } catch (error) {
    next(error);
  }
};
