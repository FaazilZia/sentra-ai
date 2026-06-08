import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

const router = Router();

router.get('/', authenticate, async (req: any, res, next) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return sendError(res, 401, 'Unauthorized');

    const assessments = await prisma.risk_assessments.findMany({
      where: { organizationId },
      include: {
        ai_system: {
          select: {
            id: true,
            name: true,
            risk_tier: true,
            status: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return sendSuccess(res, assessments);
  } catch (error) {
    next(error);
  }
});

export default router;
