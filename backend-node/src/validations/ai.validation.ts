import { z } from 'zod';

export const aiChatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(8000),
  }),
});
