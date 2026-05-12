import { z } from 'zod';

export const processAIRequestSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
});

export const checkActionSchema = z.object({
  agent: z.string(),
  action: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const processDemoRequestSchema = z.object({
  prompt: z.string(),
});

export const postRequestOverrideSchema = z.object({
  logId: z.string(),
  reason: z.string(),
});

export const postApproveOverrideSchema = z.object({
  overrideId: z.string(),
  status: z.string(),
});
