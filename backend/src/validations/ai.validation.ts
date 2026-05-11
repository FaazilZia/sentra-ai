import { z } from 'zod';

export const checkActionSchema = z.object({
  agent: z.string().min(1, "Agent ID is required"),
  action: z.string().min(1, "Action is required"),
  metadata: z.record(z.string(), z.any()).optional()
});

export const aiChatSchema = z.object({
  message: z.string().min(1, "Message is required")
});

export const postReplayActionSchema = z.object({
  logId: z.string(),
});

export const postOverrideActionSchema = z.object({
  comment: z.string().optional(),
  employeeId: z.string().optional(),
});

export type CheckActionInput = z.infer<typeof checkActionSchema>;

export type AiChatInput = z.infer<typeof aiChatSchema>;

