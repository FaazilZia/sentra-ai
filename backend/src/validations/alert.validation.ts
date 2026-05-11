import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  threshold_count: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  time_window_minutes: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  webhook_url: z.string().url(),
});
