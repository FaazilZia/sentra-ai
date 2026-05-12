import { z } from 'zod';

export const updateAlertSettingsSchema = z.object({
  alertEmail: z.string().email().optional().nullable(),
  slackWebhookUrl: z.string().url().refine(val => val.startsWith('https://hooks.slack.com/'), {
    message: 'Invalid Slack webhook URL'
  }).optional().nullable(),
});

export const emptySchema = z.object({});
