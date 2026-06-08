import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { LLMKeysService } from '../services/llmKeys.service';
import { FeatureFlagService } from '../services/featureFlag.service';
import prisma from '../config/db';

const router = Router();

// ==========================================
// Feature Toggles
// ==========================================

router.get('/features', authenticate, async (req: any, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const flags = await prisma.feature_flags.findMany({
      orderBy: { key: 'asc' },
    });

    const results = [];
    for (const flag of flags) {
      const isEnabled = await FeatureFlagService.isEnabled(flag.key, orgId);
      results.push({
        key: flag.key,
        name: flag.name,
        enabled: isEnabled,
      });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

router.patch('/features', authenticate, async (req: any, res, next) => {
  try {
    const { key, enabled } = req.body;
    if (!key || enabled === undefined) {
      return res.status(400).json({ success: false, message: 'Feature key and enabled status are required' });
    }
    const orgId = req.user.organizationId;
    await FeatureFlagService.setOrgOverride(key, orgId, enabled);
    return res.status(200).json({ success: true, message: `Feature '${key}' updated successfully` });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// LLM API Keys
// ==========================================

router.get('/llm-keys', authenticate, async (req: any, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const keys = await LLMKeysService.getKeys(orgId);
    return res.status(200).json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
});

router.post('/llm-keys', authenticate, async (req: any, res, next) => {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, message: 'Provider and API key are required' });
    }
    const orgId = req.user.organizationId;
    const addedBy = req.user.id;

    const newKey = await LLMKeysService.addKey({
      organizationId: orgId,
      provider,
      apiKey,
      addedBy,
    });

    return res.status(201).json({
      success: true,
      message: 'LLM Key added successfully',
      data: {
        id: newKey.id,
        provider: newKey.provider,
        maskedKey: newKey.maskedKey,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/llm-keys/:id', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const result = await LLMKeysService.deleteKey(id, orgId);
    if (result.count === 0) {
      return res.status(404).json({ success: false, message: 'Key not found or unauthorized' });
    }

    return res.status(200).json({ success: true, message: 'LLM Key deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
