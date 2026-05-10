import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';

export const createAlertRule = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { threshold_count, time_window_minutes, webhook_url } = req.body;
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!threshold_count || !time_window_minutes || !webhook_url) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const rule = await prisma.alert_rules.create({
      data: {
        organizationId: organizationId,
        threshold_count: parseInt(threshold_count),
        time_window_minutes: parseInt(time_window_minutes),
        webhook_url
      }
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

export const getAlertRules = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const rules = await prisma.alert_rules.findMany({
      where: { organizationId: organizationId },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};
