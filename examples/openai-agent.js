/**
 * OpenAI Agent Protection Example
 * 
 * Demonstrates how to intercept an LLM's intent to read sensitive data.
 */
const { Sentra } = require('../packages/sdk/dist'); // In real usage: @sentra/sdk

const sentra = new Sentra({
  apiKey: "demo-api-key",
  baseUrl: "http://localhost:3000/api"
});

async function runSupportAgent() {
  console.log("🤖 Support Agent starting...");

  // 1. LLM generates an intent (e.g., "I need to read the user's private credit card info")
  const agentIntent = {
    agent: "customer-support-bot",
    action: "read_pii",
    metadata: {
      field: "credit_card_number",
      user_id: "user_99"
    }
  };

  console.log(`🔍 Intercepting action: ${agentIntent.action}...`);

  // 2. Sentra Interception
  const result = await sentra.safeAction(agentIntent, async () => {
    // This logic is PROTECTED. It will not run if Sentra blocks it.
    console.log("✅ ACCESS GRANTED. Reading database...");
    return { data: "4111-XXXX-XXXX-1111" };
  });

  if (!result.success) {
    console.error(`❌ ACTION BLOCKED by Sentra AI`);
    console.error(`Reason: ${result.governance.reason}`);
    console.error(`Impact: ${result.governance.impact}`);
    console.error(`Compliance: ${JSON.stringify(result.governance.compliance)}`);
  } else {
    console.log("Result:", result.result);
  }
}

runSupportAgent();
