import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

const router = Router();

router.get('/', authenticate, async (req: any, res, next) => {
  try {
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return sendError(res, 401, 'Unauthorized');

    const forms = await prisma.intake_forms.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, forms);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: any, res, next) => {
  try {
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return sendError(res, 401, 'Unauthorized');

    const form = await prisma.intake_forms.findFirst({
      where: { id: req.params.id, orgId }
    });
    if (!form) return sendError(res, 404, 'Form not found');

    return sendSuccess(res, form);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: any, res, next) => {
  try {
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return sendError(res, 401, 'Unauthorized');

    const { title, description, fields, isActive } = req.body;
    if (!title) return sendError(res, 400, 'Title is required');

    const newForm = await prisma.intake_forms.create({
      data: {
        orgId,
        title,
        description: description || null,
        fields: fields || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return sendSuccess(res, newForm, 201);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: any, res, next) => {
  try {
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return sendError(res, 401, 'Unauthorized');

    const { title, description, fields, isActive } = req.body;

    const existing = await prisma.intake_forms.findFirst({
      where: { id: req.params.id, orgId }
    });
    if (!existing) return sendError(res, 404, 'Form not found');

    const updated = await prisma.intake_forms.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(fields !== undefined && { fields }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

export default router;
