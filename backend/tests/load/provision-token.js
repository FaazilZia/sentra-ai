#!/usr/bin/env node
'use strict';

/**
 * Provisions a disposable test user via the same CSRF handshake pattern
 * used by setupE2ETestToken, then outputs the JWT to stdout for use
 * as TEST_AUTH_TOKEN by Artillery.
 */

const BASE_URL = process.env.LOAD_TARGET_URL || 'http://127.0.0.1:10000';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!';
const suffix = `load-${Date.now()}`;
const email = `test-${suffix}@sentra-test.com`;
const orgName = `test-org-load-${suffix}`;

async function provisionToken() {
  let csrfToken = '';
  let cookieHeader = '';

  function captureCsrf(res) {
    const xCsrf = res.headers.get('x-csrf-token');
    if (xCsrf) csrfToken = xCsrf;

    const setCookie = res.headers.get('set-cookie') || '';
    const match = setCookie.match(/sentra_csrf_token=[^;]+/);
    if (match) {
      cookieHeader = match[0];
    } else if (setCookie) {
      cookieHeader = setCookie.split(';')[0].trim();
    }
  }

  async function postWithCsrf(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    let res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.status === 403) {
      const json = await res.json();
      if (json.error === 'CSRF_INVALID') {
        captureCsrf(res);
        const retryHeaders = { 'Content-Type': 'application/json' };
        if (csrfToken) retryHeaders['x-csrf-token'] = csrfToken;
        if (cookieHeader) retryHeaders['Cookie'] = cookieHeader;
        res = await fetch(`${BASE_URL}${path}`, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(body),
        });
      }
    } else {
      captureCsrf(res);
    }
    return res;
  }

  // Register
  const regRes = await postWithCsrf('/api/v1/auth/register', {
    email,
    password: TEST_PASSWORD,
    fullName: 'Load Test User',
    organizationName: orgName,
  });

  if (regRes.status !== 201 && regRes.status !== 200) {
    const body = await regRes.text();
    throw new Error(`Registration failed (${regRes.status}): ${body}`);
  }

  // Login
  const loginRes = await postWithCsrf('/api/v1/auth/login', {
    email,
    password: TEST_PASSWORD,
  });

  if (loginRes.status !== 200) {
    const body = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${body}`);
  }

  const data = await loginRes.json();
  const token = data.data?.accessToken;
  if (!token) {
    throw new Error(`No token in login response: ${JSON.stringify(data)}`);
  }

  process.stdout.write(token);
}

provisionToken().catch((err) => {
  process.stderr.write(`[provision-token] ERROR: ${err.message}\n`);
  process.exit(1);
});
