import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';

export const getOrganizationById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestOrganizationId = await resolveOrganizationId(req);
    if (requestOrganizationId && id !== requestOrganizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const company = await prisma.organizations.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlertSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { alertEmail, slackWebhookUrl } = req.body;

    // Basic validation
    if (alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (slackWebhookUrl && !slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ success: false, message: 'Invalid Slack webhook URL' });
    }

    const updated = await prisma.organizations.update({
      where: { id: organizationId },
      data: {
        alertEmail: alertEmail || null,
        slackWebhookUrl: slackWebhookUrl || null,
        updated_at: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Alert settings updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

import { alertService } from '../services/alert.service';

export const testAlert = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const dummyDecision = {
      status: 'blocked',
      risk: 'high',
      reason: 'This is a test notification from the Sentra AI dashboard.',
      compliance: ['TEST_POLICY'],
      explanation: 'Verifying that your alert channels are correctly configured.'
    };

    alertService.notify(organizationId, dummyDecision, 'Test Agent', 'TEST_ACTION');

    res.status(200).json({
      success: true,
      message: 'Test alerts dispatched'
    });
  } catch (error) {
    next(error);
  }
};
