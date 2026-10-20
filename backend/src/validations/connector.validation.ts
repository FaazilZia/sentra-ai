import { z } from 'zod';

export const createConnectorSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['postgres', 'sql', 's3', 'gdrive']),
    config: z.record(z.string(), z.unknown()).optional(),
    credentials: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
    scope: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const testConnectorSchema = z.object({
  body: z.object({
    type: z.enum(['postgres', 'sql', 's3', 'gdrive']),
    config: z.record(z.string(), z.unknown()).optional(),
    credentials: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  }),
});
