import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
});

export const apiKeyIdParamSchema = z.object({
  keyId: z.string().uuid(),
});


