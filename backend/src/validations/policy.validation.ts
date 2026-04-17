import { z } from 'zod';

export const policyIdVersionsParamSchema = z.object({
  params: z.object({
    policyId: z.string().uuid(),
  }),
});
