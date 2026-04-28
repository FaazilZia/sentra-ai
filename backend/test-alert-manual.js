require('dotenv').config();
const { alertService } = require('./dist/src/services/alert.service');
const prisma = require('./dist/src/config/db').default;

async function runTest() {
  await require('./dist/src/config/db').initializePrisma();
  const orgId = "00000000-0000-0000-0000-000000000001";
  
  // 1. Temporarily set test email for the org
  console.log('Setting test email for org...');
  await prisma.organizations.update({
    where: { id: orgId },
    data: { 
      alertEmail: "faazilzia01@gmail.com", // Account owner for Resend onboarding
      slackWebhookUrl: null 
    }
  });

  const dummyDecision = {
    status: 'blocked',
    risk: 'high',
    reason: 'Artificial Intelligence policy violation detected (Test).',
    compliance: ['GDPR', 'AI_ACT'],
    explanation: 'Testing the Sentra AI notification gateway with Resend.com'
  };

  console.log('Dispatching test alert...');
  await alertService.sendEmailAlert(orgId, {
    agent: "Safety-Bot-9000",
    action: "EXFILTRATE_DATA",
    risk: "high",
    reason: "Attempted to move sensitive PII outside the secure boundary.",
    policyTriggered: "GDPR Data Sovereignty",
    timestamp: new Date()
  });

  console.log('Test alert sent! Please check your inbox (mohammadfaazilzia@gmail.com).');
}

runTest().catch(console.error);
