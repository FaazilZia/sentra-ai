/**
 * Jest globalSetup — runs once before all test suites in a worker.
 * Polls the Render health endpoint until the server is warm (free-tier cold start
 * can take up to 60s). This prevents per-suite 30s timeout failures.
 */
import https from 'https';

const BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
const MAX_WAIT_MS = 90_000;
const POLL_INTERVAL_MS = 3_000;

function ping(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(`${url}/api/health`, { timeout: 8000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

export default async function globalSetup(): Promise<void> {
  const start = Date.now();
  console.log(`\n[globalSetup] Warming up Render server at ${BASE_URL} …`);

  while (Date.now() - start < MAX_WAIT_MS) {
    const ok = await ping(BASE_URL);
    if (ok) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[globalSetup] Server is warm ✅  (${elapsed}s)\n`);
      return;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`[globalSetup] Still cold (${elapsed}s elapsed) — retrying…\r`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.warn(`\n[globalSetup] ⚠️  Server did not respond within ${MAX_WAIT_MS / 1000}s — proceeding anyway`);
}
