

import 'dotenv/config';
import request from 'supertest';
import { getAuthToken } from './getAuthToken';

const AUTH_TOKEN = getAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

export async function setupE2ETestToken(prefix: string): Promise<string> {
  // Wait for the server/db to be ready/settle
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (AUTH_TOKEN) {
    return AUTH_TOKEN;
  }

  const testOrg = `test-org-${prefix}-${Date.now()}`;
  const testEmail = `test-${prefix}-${Date.now()}@sentra-test.com`;
  const testPassword = process.env.TEST_PASSWORD;

  if (!testPassword) {
    throw new Error('TEST_PASSWORD environment variable is required for E2E tests but not defined.');
  }

  const regRes = await request(TEST_BASE_URL)
    .post('/api/v1/auth/register')
    .send({
      email: testEmail,
      password: testPassword,
      fullName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Tester`,
      organizationName: testOrg,
    });

  const loginRes = await request(TEST_BASE_URL)
    .post('/api/v1/auth/login')
    .send({
      email: testEmail,
      password: testPassword,
    });

  const token = loginRes.body.data?.accessToken;
  if (!token) {
    throw new Error(`Failed to retrieve E2E auth token for ${prefix}. Status: ${loginRes.status}, Body: ${JSON.stringify(loginRes.body)}`);
  }
  return token;
}
