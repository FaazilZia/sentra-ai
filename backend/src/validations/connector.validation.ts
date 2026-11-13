import { z } from 'zod';

export const SLACK_BOT_TOKEN_REGEX = /^xoxb-[0-9A-Za-z-]{20,120}$/;
export const GITHUB_TOKEN_REGEX = /^(github_pat_[0-9A-Za-z_]{20,255}|ghp_[0-9A-Za-z]{36,255})$/;

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

export function extractGitHubToken(credentials: unknown, config?: unknown): string | undefined {
  if (typeof credentials === 'string') {
    return credentials.trim();
  }
  if (credentials && typeof credentials === 'object') {
    const credObj = credentials as Record<string, unknown>;
    if (typeof credObj.token === 'string' && credObj.token.trim()) {
      return credObj.token.trim();
    }
    if (typeof credObj.personalAccessToken === 'string' && credObj.personalAccessToken.trim()) {
      return credObj.personalAccessToken.trim();
    }
    if (typeof credObj.pat === 'string' && credObj.pat.trim()) {
      return credObj.pat.trim();
    }
    if (typeof credObj.apiKey === 'string' && credObj.apiKey.trim()) {
      return credObj.apiKey.trim();
    }
    if (typeof credObj.botToken === 'string' && credObj.botToken.trim()) {
      return credObj.botToken.trim();
    }
  }
  if (config && typeof config === 'object') {
    const confObj = config as Record<string, unknown>;
    if (typeof confObj.token === 'string' && confObj.token.trim()) {
      return confObj.token.trim();
    }
    if (typeof confObj.personalAccessToken === 'string' && confObj.personalAccessToken.trim()) {
      return confObj.personalAccessToken.trim();
    }
    if (typeof confObj.pat === 'string' && confObj.pat.trim()) {
      return confObj.pat.trim();
    }
    if (typeof confObj.apiKey === 'string' && confObj.apiKey.trim()) {
      return confObj.apiKey.trim();
    }
    if (typeof confObj.botToken === 'string' && confObj.botToken.trim()) {
      return confObj.botToken.trim();
    }
  }
  return undefined;
}

export const createConnectorSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(255),
      type: z.enum(['postgres', 'sql', 's3', 'gdrive', 'slack', 'github']),
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
    )
    .refine(
      (data) => {
        if (data.type !== 'github') return true;
        const token = extractGitHubToken(data.credentials, data.config);
        return typeof token === 'string' && GITHUB_TOKEN_REGEX.test(token);
      },
      {
        message: "Invalid GitHub personal access token format. Fine-grained personal access tokens must begin with 'github_pat_' (or 'ghp_') and contain valid alphanumeric characters.",
        path: ['credentials'],
      }
    ),
});

export const testConnectorSchema = z.object({
  body: z
    .object({
      type: z.enum(['postgres', 'sql', 's3', 'gdrive', 'slack', 'github']),
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
    )
    .refine(
      (data) => {
        if (data.type !== 'github') return true;
        const token = extractGitHubToken(data.credentials, data.config);
        return typeof token === 'string' && GITHUB_TOKEN_REGEX.test(token);
      },
      {
        message: "Invalid GitHub personal access token format. Fine-grained personal access tokens must begin with 'github_pat_' (or 'ghp_') and contain valid alphanumeric characters.",
        path: ['credentials'],
      }
    ),
});

