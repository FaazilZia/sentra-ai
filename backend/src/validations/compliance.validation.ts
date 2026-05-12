import { z } from 'zod';

export const postFixTasksSchema = z.object({
  featureId: z.string(),
  actionPlan: z.string(),
});

export const postEvidenceSchema = z.object({
  taskId: z.string(),
  type: z.string(),
  value: z.string(),
  source_type: z.string(),
});

export const postReEvaluateSchema = z.object({
  featureId: z.string(),
});

export const postMarkAlertReadSchema = z.object({
  alertId: z.string(),
});
