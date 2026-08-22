import 'dotenv/config';
import request from 'supertest';
import { getAuthToken } from './getAuthToken';

const AUTH_TOKEN = getAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

if (typeof jest !== 'undefined') {
  jest.setTimeout(120000);
}

export async function setupE2ETestToken(prefix: string): Promise<string> {
  // Wait for the server/db to be ready/settle
  await new Promise(resolve => setTimeout(resolve, 100));

  if (AUTH_TOKEN) {
    return AUTH_TOKEN;
  }

  const testPassword = process.env.TEST_PASSWORD;
  if (!testPassword) {
    throw new Error('TEST_PASSWORD environment variable is required for E2E tests but not defined.');
  }

  let csrfToken = '';
  let cookieHeader = '';

  const captureCsrfFromRes = (res: any) => {
    if (res.headers['x-csrf-token']) {
      csrfToken = res.headers['x-csrf-token'];
    }
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      const match = rawCookie.match(/sentra_csrf_token=[^;]+/);
      if (match) {
        cookieHeader = match[0];
      } else {
        cookieHeader = rawCookie.split(';')[0].trim();
      }
    }
  };

  const sendWithCsrfHandshake = async (urlPath: string, payload: object) => {
    let reqObj = request(TEST_BASE_URL).post(urlPath);
    if (csrfToken) reqObj.set('x-csrf-token', csrfToken);
    if (cookieHeader) reqObj.set('Cookie', cookieHeader);

    let res = await reqObj.send(payload);

    if (res.status === 403 && res.body?.error === 'CSRF_INVALID') {
      captureCsrfFromRes(res);
      reqObj = request(TEST_BASE_URL).post(urlPath);
      if (csrfToken) reqObj.set('x-csrf-token', csrfToken);
      if (cookieHeader) reqObj.set('Cookie', cookieHeader);
      res = await reqObj.send(payload);
    } else {
      captureCsrfFromRes(res);
    }

    return res;
  };

  // Register disposable, uniquely-timestamped test tenant
  const testOrg = `test-org-${prefix}-${Date.now()}`;
  const testEmail = `test-${prefix}-${Date.now()}@sentra-test.com`;

  const regRes = await sendWithCsrfHandshake('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    fullName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Tester`,
    organizationName: testOrg,
  });

  if (regRes.status !== 201 && regRes.status !== 200 && regRes.status !== 409) {
    throw new Error(`Failed to register disposable E2E user for ${prefix}. Status: ${regRes.status}, Body: ${JSON.stringify(regRes.body)}`);
  }

  const loginRes = await sendWithCsrfHandshake('/api/v1/auth/login', {
    email: testEmail,
    password: testPassword,
  });

  const token = loginRes.body.data?.accessToken;
  if (!token) {
    throw new Error(`Failed to retrieve E2E auth token for ${prefix}. Status: ${loginRes.status}, Body: ${JSON.stringify(loginRes.body)}`);
  }
  return token;
}
