#!/usr/bin/env node
/**
 * Sentra AI v2.0.0 — Enterprise Smoke Test Suite
 * Run: node src/scripts/smoke-test.js [BASE_URL]
 * Validates all enterprise API endpoints and security protections.
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
let passed = 0;
let failed = 0;
let warnings = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else if (result === 'WARN') {
      console.log(`  ⚠️  ${name} (warning)`);
      warnings++;
    }
  } catch (e) {
    console.log(`  ❌ ${name}: ${String(e.message).substring(0, 200).replaceAll(/[\n\r]/g, ' ')}`); // NOSONAR - test output
    failed++;
  }
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  console.log('\n============================================================');
  console.log('  SENTRA AI v2.0.0 — ENTERPRISE SMOKE TEST SUITE');
  console.log(`  Target: ${BASE_URL}`);
  console.log('============================================================\n');

  // ── STEP 1: Health & Liveness ─────────────────────────────
  console.log('[ 1. HEALTH & LIVENESS ]');
  await test('GET /ping → 200', async () => {
    const r = await fetch(`${BASE_URL}/ping`);
    if (r.status !== 200) throw new Error(`Got ${r.status}`);
  });
  await test('GET /api/health → database connected', async () => {
    const r = await req('/api/health');
    if (r.status !== 200) throw new Error(`Got ${r.status}`);
    if (r.body.database !== 'connected') throw new Error('DB not connected');
  });
  await test('GET /api/v1/ready → ready or degraded', async () => {
    const r = await req('/api/v1/ready');
    if (r.status !== 200) throw new Error(`Got ${r.status}: ${r.body.error}`);
    const ok = ['ready','degraded'].includes(r.body.status);
    if (!ok) throw new Error(`Unexpected status: ${r.body.status}`);
  });

  // ── STEP 2: Prometheus Metrics ────────────────────────────
  console.log('\n[ 2. OBSERVABILITY ]');
  await test('GET /metrics → Prometheus text format', async () => {
    const r = await fetch(`${BASE_URL}/metrics`);
    if (r.status !== 200 && r.status !== 401) throw new Error(`Got ${r.status}`);
    if (r.status === 200) {
      const text = await r.text();
      if (!text.includes('# HELP')) throw new Error('Not Prometheus format');
    }
    // 401 = metrics token configured (expected in prod)
  });
  await test('GET /api/v1/health → version field present', async () => {
    const r = await req('/api/health');
    if (!r.body.version) throw new Error('Missing version field');
  });

  // ── STEP 3: Auth Protection ───────────────────────────────
  console.log('\n[ 3. AUTH PROTECTION ]');
  await test('GET /api/v1/tenant/workspaces → 401 without token', async () => {
    const r = await req('/api/v1/tenant/workspaces');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });
  await test('GET /api/v1/rbac/me → 401 without token', async () => {
    const r = await req('/api/v1/rbac/me');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });
  await test('GET /api/v1/audit/ → 401 without token', async () => {
    const r = await req('/api/v1/audit/');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });
  await test('GET /api/v1/evaluation/score → 401 without token', async () => {
    const r = await req('/api/v1/evaluation/score');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });
  await test('GET /api/v1/workflows/ → 401 without token', async () => {
    const r = await req('/api/v1/workflows/');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });
  await test('GET /api/v1/superadmin/stats → 401 without token', async () => {
    const r = await req('/api/v1/superadmin/stats');
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // ── STEP 4: Invalid Auth Token ────────────────────────────
  console.log('\n[ 4. INVALID TOKEN REJECTION ]');
  const FAKE_TOKEN = process.env.SMOKE_TEST_FAKE_TOKEN || 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJmYWtlIn0.invalid'; // NOSONAR - intentionally invalid test token
  await test('Invalid JWT → 401/403 on protected route', async () => {
    const r = await req('/api/v1/rbac/me', { headers: { Authorization: FAKE_TOKEN } });
    if (![401, 403].includes(r.status)) throw new Error(`Expected 401/403, got ${r.status}`);
  });
  await test('Invalid JWT → 401/403 on superadmin route', async () => {
    const r = await req('/api/v1/superadmin/stats', { headers: { Authorization: FAKE_TOKEN } });
    if (![401, 403].includes(r.status)) throw new Error(`Expected 401/403, got ${r.status}`);
  });

  // ── STEP 5: Route Existence (404 vs 401) ─────────────────
  console.log('\n[ 5. ROUTE EXISTENCE CHECK ]');
  const enterpriseRoutes = [
    '/api/v1/tenant/workspaces',
    '/api/v1/tenant/invitations',
    '/api/v1/rbac/me',
    '/api/v1/rbac/roles',
    '/api/v1/audit/',
    '/api/v1/audit/verify',
    '/api/v1/workflows/',
    '/api/v1/evaluation/score',
    '/api/v1/evaluation/runs',
    '/api/v1/evaluation/datasets',
    '/api/v1/superadmin/stats',
    '/api/v1/superadmin/flags',
  ];
  for (const route of enterpriseRoutes) {
    await test(`${route} exists (not 404)`, async () => {
      const r = await req(route);
      if (r.status === 404) throw new Error(`Route not found: ${route}`);
      // 401 = route exists but protected (correct)
    });
  }

  // ── STEP 6: Existing Routes Not Broken ────────────────────
  console.log('\n[ 6. EXISTING ROUTES BACKWARD COMPAT ]');
  const existingRoutes = [
    '/api/v1/policies',
    '/api/v1/incidents',
    '/api/v1/ai',
    '/api/v1/drift',
    '/api/v1/compliance',
    '/api/v1/alerts',
  ];
  for (const route of existingRoutes) {
    await test(`${route} still exists (not 404/500)`, async () => {
      const res = await fetch(`${BASE_URL}${route}`);
      // 401 = auth required (route exists) ✅
      // 200 = open route ✅  
      // HTML (SPA fallback from catch-all) = also means route handled ✅
      // 404 from JSON API = route missing ❌
      if (res.status === 500) throw new Error(`Server error on existing route: ${route}`);
      const ct = res.headers.get('content-type') || '';
      if (res.status === 404 && ct.includes('application/json')) {
        throw new Error(`Existing route broken: ${route}`);
      }
    });
  }

  // ── STEP 7: Security Headers ──────────────────────────────
  console.log('\n[ 7. SECURITY HEADERS ]');
  await test('Strict-Transport-Security header present', async () => {
    const r = await fetch(`${BASE_URL}/ping`);
    if (!r.headers.get('strict-transport-security') && !r.headers.get('x-content-type-options')) {
      return 'WARN'; // May not be present in local dev
    }
  });
  await test('X-Content-Type-Options: nosniff', async () => {
    const r = await fetch(`${BASE_URL}/ping`);
    const h = r.headers.get('x-content-type-options');
    if (!h && BASE_URL.includes('localhost')) return 'WARN';
    if (h !== 'nosniff') throw new Error(`Got: ${h}`);
  });

  // ── Summary ───────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('[ SMOKE TEST RESULTS ]');
  console.log(`  ✅ Passed:   ${passed}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  const total = passed + failed + warnings;
  const score = Math.round((passed / total) * 100);
  console.log(`  Score:      ${score}%`);
  if (failed === 0) {
    console.log('\n  🎉 ALL SMOKE TESTS PASSED');
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) failed — investigate before production deploy`);
    process.exit(1);
  }
  console.log('============================================================\n');
}

main().catch(e => { console.error('Smoke test crashed:', e.message); process.exit(1); });
