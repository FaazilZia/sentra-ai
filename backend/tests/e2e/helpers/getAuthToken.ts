import fs from 'fs';
import path from 'path';
import os from 'os';

export function getAuthToken(): string {
  try {
    const tokenPath = path.join(os.tmpdir(), 'sentra_ci_token.json');
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.CI_AUTH_TOKEN || '';
  } catch {
    return process.env.CI_AUTH_TOKEN || '';
  }
}

export function getOrgId(): string {
  try {
    const tokenPath = path.join(os.tmpdir(), 'sentra_ci_token.json');
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.CI_ORG_ID || '';
  } catch {
    return process.env.CI_ORG_ID || '';
  }
}
