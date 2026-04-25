const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

async function main() {
  const prisma = new PrismaClient();
  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdhYzQ2MGNmLThkZmQtNDQyYi05OGFjLTgxMzY1YmVkYWZkZCIsInJvbGUiOiJBRE1JTiIsIm9yZ2FuaXphdGlvbklkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiaWF0IjoxNzc3MDY4NzU2LCJleHAiOjE3NzcwNjk2NTZ9.IMMA6n7CfPdeMEY2lUVu8z1JOdTSKsX9b62wba2s7P4";
  const OTHER_ORG = "99999999-9999-9999-9999-999999999999";
  const API_URL = "https://sentra-backend-node.onrender.com/api/v1/incidents";

  const incidentId = crypto.randomUUID();
  
  try {
    // 1. Create incident in DIFFERENT org
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

    // 2. Try to fetch it via API
    console.log('Attempting unauthorized fetch...');
    const response = await fetch(`${API_URL}/${incidentId}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log('API Status:', response.status);
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data));

    if (response.status === 404 || response.status === 403) {
      console.log('✅ SUCCESS: Unauthorized access blocked with status ' + response.status);
    } else {
      console.log('❌ FAILURE: Resource leaked or wrong status code');
    }

    // 3. Cleanup
    await prisma.incidents.delete({ where: { id: incidentId } });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
