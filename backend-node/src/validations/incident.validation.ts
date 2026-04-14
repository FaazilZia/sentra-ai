import { z } from 'zod';

export const logIncidentSchema = z.object({
  body: z.object({
    agent_id: z.string().min(1),
    action: z.string().min(1),
    severity: z.coerce.number().int().min(0).max(100),
    policy_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
    details: z.string().optional(),
    prompt_excerpt: z.string().optional(),
    response_excerpt: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const updateIncidentStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.string().min(1),
  }),
});

export const getIncidentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const triggerScanSchema = z.object({
  body: z.record(z.string(), z.unknown()).optional(),
});
