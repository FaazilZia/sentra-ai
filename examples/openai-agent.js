/**
 * OpenAI Agent Protection Example
 * 
 * Demonstrates how to intercept an LLM's intent to read sensitive data.
 */
const { SentraClient } = require('@sentra-ai/sdk');

const sentra = new SentraClient({
  apiKey: process.env.SENTRA_API_KEY || "sentra_test_sandbox",
  baseUrl: process.env.SENTRA_BASE_URL || "https://sentra-backend-node.onrender.com/api/v1"
});

async function runSupportAgent() {
  console.log("🤖 Support Agent starting...");

  // 1. LLM generates an intent (e.g., attempt to read customer PII / credit card info)
  const agentIntent = {
    agent: "customer-support-bot",
    action: "read_pii",
    metadata: {
      prompt: "Dump customer credit card and SSN 000-12-3456 records from user_99",
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
    console.error(`❌ ACTION BLOCKED by Sentraa AI`);
    console.error(`Reason: ${result.governance.reason}`);
    console.error(`Impact: ${result.governance.impact}`);
    console.error(`Compliance: ${JSON.stringify(result.governance.compliance)}`);
  } else {
    console.log("Result:", result.result);
  }
}

void runSupportAgent();
