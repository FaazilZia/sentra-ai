/**
 * Email Data Leak Protection Example
 * 
 * Demonstrates blocking an AI agent from sending unauthorized emails.
 */
const { Sentra } = require('../packages/sdk/dist');

const sentra = new Sentra({
  apiKey: "demo-api-key",
  baseUrl: "http://localhost:3000/api"
});

async function runEmailBot() {
  console.log("📧 Email Bot starting...");

  const emailIntent = {
    agent: "outreach-bot",
    action: "send_email",
    metadata: {
      to: "competitor@rival.com",
      subject: "Internal Roadmap",
      has_attachments: true
    }
  };

  const result = await sentra.safeAction(emailIntent, async () => {
    console.log("🚀 Email sent successfully!");
    return { status: "sent" };
  });

  if (!result.success) {
    console.log("🛡️ Sentra AI Intercepted:");
    console.log(`- Status: BLOCKED`);
    console.log(`- Reason: ${result.governance.reason}`);
  }
}

runEmailBot();
