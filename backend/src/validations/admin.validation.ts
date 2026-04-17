import { z } from 'zod';

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
  }),
});

export const apiKeyIdParamSchema = z.object({
  params: z.object({
    keyId: z.string().uuid(),
  }),
});
