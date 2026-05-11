import { z } from 'zod';

export const agentSchema = z.object({
  name: z.string(),
  model: z.string(),
  permissions: z.any().optional(),
  status: z.string().optional(),
  dependencies: z.array(z.any()).optional(),
});
