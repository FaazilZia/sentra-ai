import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
const MAX_WAIT_MS = 90_000;
const POLL_INTERVAL_MS = 3_000;
const TOKEN_FILE_PATH = path.join(os.tmpdir(), 'sentra_ci_token.json');

function ping(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(`${url}/api/health`, { timeout: 8000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

export default async function globalSetup(): Promise<void> {
  const start = Date.now();
  console.log(`\n[globalSetup] Warming up Render server at ${BASE_URL} …`);

  let warmedUp = false;
  while (Date.now() - start < MAX_WAIT_MS) {
    const ok = await ping(BASE_URL);
    if (ok) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[globalSetup] Server is warm ✅  (${elapsed}s)\n`);
      warmedUp = true;
      break;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`[globalSetup] Still cold (${elapsed}s elapsed) — retrying…\r`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (!warmedUp) {
    console.warn(`\n[globalSetup] ⚠️  Server did not respond within ${MAX_WAIT_MS / 1000}s — proceeding anyway`);
  }

  try {
    console.log(`[globalSetup] Registering CI admin user...`);
    // Register test admin (ignore any error if already exists)
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@sentra.ai',
        password: 'Sentra@Admin123',
        fullName: 'CI Admin',
        organizationName: 'sentra-ci-org'
      })
    }).catch(err => console.warn('[globalSetup] Registration fetch error:', err));

    console.log(`[globalSetup] Logging in CI admin user...`);
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sentra.ai', password: 'Sentra@Admin123' })
    });

    const loginJson: any = await loginRes.json();
    const token = loginJson?.data?.accessToken || '';
    const orgId = loginJson?.data?.user?.organizationId || '';

    process.env.CI_AUTH_TOKEN = token;
    process.env.CI_ORG_ID = orgId;

    // Cache the token to temporary directory for parallel test workers
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify({
      CI_AUTH_TOKEN: token,
      CI_ORG_ID: orgId
    }, null, 2));

    console.log(`[globalSetup] Token saved successfully to ${TOKEN_FILE_PATH}.`);
  } catch (err) {
    console.error('[globalSetup] Error setting up CI admin credentials:', err);
  }
}

