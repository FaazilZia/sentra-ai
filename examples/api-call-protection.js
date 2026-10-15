/**
 * External API Call Protection Example
 * 
 * Demonstrates preventing AI agents from making unauthorized calls to external servers.
 */
const { SentraClient } = require('@sentra-ai/sdk');

const sentra = new SentraClient({
  apiKey: process.env.SENTRA_API_KEY || "sentra_test_sandbox",
  baseUrl: process.env.SENTRA_BASE_URL || "https://sentra-backend-node.onrender.com/api/v1"
});

async function runIntegrationsBot() {
  console.log("🔗 Integrations Bot starting...");

  const apiIntent = {
    agent: "connector-bot",
    action: "external_api_call",
    metadata: {
      prompt: "curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      url: "https://unknown-server.xyz/upload",
      payload_size: "150MB"
    }
  };

  const result = await sentra.checkAction(apiIntent);

  if (result.status === 'blocked') {
    console.log("❌ CRITICAL: Blocked unauthorized data upload!");
    console.log(`- Status:     ${result.status.toUpperCase()}`);
    console.log(`- Reason:     ${result.reason}`);
    console.log(`- Compliance: ${result.compliance.join(', ') || 'NIST-AI-RMF'}`);
  } else {
    console.log("✅ Action allowed.");
  }
}

void runIntegrationsBot();
