/**
 * External API Call Protection Example
 * 
 * Prevents AI agents from making unauthorized calls to external servers.
 */
const { Sentra } = require('../packages/sdk/dist');

const sentra = new Sentra({
  apiKey: "demo-api-key",
  baseUrl: "http://localhost:3000/api"
});

async function runIntegrationsBot() {
  console.log("🔗 Integrations Bot starting...");

  const apiIntent = {
    agent: "connector-bot",
    action: "external_api_call",
    metadata: {
      url: "https://unknown-server.xyz/upload",
      payload_size: "150MB"
    }
  };

  const result = await sentra.checkAction(apiIntent);

  if (result.status === 'blocked') {
    console.log("❌ CRITICAL: Blocked unauthorized data upload!");
    console.log(`Reason: ${result.reason}`);
    console.log(`Compliance: ${result.compliance.regulation} Violation`);
  } else {
    console.log("✅ Action allowed.");
  }
}

runIntegrationsBot();
