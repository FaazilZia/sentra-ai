import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdhYzQ2MGNmLThkZmQtNDQyYi05OGFjLTgxMzY1YmVkYWZkZCIsInJvbGUiOiJBRE1JTiIsIm9yZ2FuaXphdGlvbklkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiaWF0IjoxNzc3MDY4NzU2LCJleHAiOjE3NzcwNjk2NTZ9.IMMA6n7CfPdeMEY2lUVu8z1JOdTSKsX9b62wba2s7P4";
const OTHER_ORG = "99999999-9999-9999-9999-999999999999";
const API_URL = "https://sentra-backend-node.onrender.com/api/v1/incidents";

async function main() {
  const incidentId = crypto.randomUUID();
  
  // 1. Create incident in DIFFERENT org directly in DB
  await prisma.incidents.create({
    data: {
      id: incidentId,
      organizationId: OTHER_ORG,
      agent_id: 'privacy-test-agent',
      action: 'leak_test',
      severity: 99,
      details: 'SECRET DATA FROM ANOTHER ORG',
      status: 'unresolved'
    }
  });
  console.log('Created cross-tenant incident:', incidentId);

  // 2. Try to fetch it via API using Current User token
  console.log('Attempting unauthorized fetch...');
  const res = await fetch(`${API_URL}/${incidentId}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });

  console.log('API Status:', res.status);
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data));

  // 3. Cleanup
  await prisma.incidents.delete({ where: { id: incidentId } });
}

main().catch(console.error).finally(() => prisma.$disconnect());
