import { z } from 'zod';

export const resolveIncidentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['RESOLVED', 'DISMISSED']),
  }),
});

export const getIncidentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
