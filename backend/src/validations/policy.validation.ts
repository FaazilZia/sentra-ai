import { z } from 'zod';

export const policyIdVersionsParamSchema = z.object({
  params: z.object({
    policyId: z.string().uuid(),
  }),
});
export const createPolicySchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    effect: z.enum(['allow', 'deny']),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(1).default(1),
    conditions: z.record(z.any()).default({}),
    scope: z.record(z.any()).default({}),
    obligations: z.record(z.any()).default({}),
  }),
});
