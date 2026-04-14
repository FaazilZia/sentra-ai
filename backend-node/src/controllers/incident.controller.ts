import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import logger from '../utils/logger';

export const getIncidents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const incidents = await prisma.incidents.findMany({
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.status(200).json({
      success: true,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const incident = await prisma.incidents.findUnique({ where: { id } });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

export const resolveIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g., 'RESOLVED', 'DISMISSED'

    const updatedIncident = await prisma.incidents.update({
      where: { id },
      data: { status: status || 'RESOLVED' }
    });

    res.status(200).json({
      success: true,
      message: 'Incident resolved successfully',
      data: updatedIncident
    });
  } catch (error) {
    next(error);
  }
};
