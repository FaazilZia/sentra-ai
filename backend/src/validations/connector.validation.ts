import { z } from 'zod';

export const SLACK_BOT_TOKEN_REGEX = /^xoxb-[0-9A-Za-z-]{20,120}$/;

export function extractSlackToken(credentials: unknown, config?: unknown): string | undefined {
  if (typeof credentials === 'string') {
    return credentials.trim();
  }
  if (credentials && typeof credentials === 'object') {
    const credObj = credentials as Record<string, unknown>;
    if (typeof credObj.botToken === 'string' && credObj.botToken.trim()) {
      return credObj.botToken.trim();
    }
    if (typeof credObj.token === 'string' && credObj.token.trim()) {
      return credObj.token.trim();
    }
  }
  if (config && typeof config === 'object') {
    const confObj = config as Record<string, unknown>;
    if (typeof confObj.botToken === 'string' && confObj.botToken.trim()) {
      return confObj.botToken.trim();
    }
    if (typeof confObj.token === 'string' && confObj.token.trim()) {
      return confObj.token.trim();
    }
  }
  return undefined;
}

export const createConnectorSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(255),
      type: z.enum(['postgres', 'sql', 's3', 'gdrive', 'slack']),
      config: z.record(z.string(), z.unknown()).optional(),
      credentials: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
      scope: z.record(z.string(), z.unknown()).optional(),
    })
    .refine(
      (data) => {
        if (data.type !== 'slack') return true;
        const token = extractSlackToken(data.credentials, data.config);
        return typeof token === 'string' && SLACK_BOT_TOKEN_REGEX.test(token);
      },
      {
        message: "Invalid Slack bot token format. Bot tokens must begin with 'xoxb-' and contain valid alphanumeric characters.",
        path: ['credentials'],
      }
    ),
});

export const testConnectorSchema = z.object({
  body: z
    .object({
      type: z.enum(['postgres', 'sql', 's3', 'gdrive', 'slack']),
      config: z.record(z.string(), z.unknown()).optional(),
      credentials: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
    })
    .refine(
      (data) => {
        if (data.type !== 'slack') return true;
        const token = extractSlackToken(data.credentials, data.config);
        return typeof token === 'string' && SLACK_BOT_TOKEN_REGEX.test(token);
      },
      {
        message: "Invalid Slack bot token format. Bot tokens must begin with 'xoxb-' and contain valid alphanumeric characters.",
        path: ['credentials'],
      }
    ),
});

