import { SentraClient } from '../packages/sdk/src/index';

const sentra = new SentraClient({
  apiKey: "your-api-key",
  baseUrl: "http://localhost:3000/api/v1"
});

// Example 1: OpenAI Wrapper
// const openai = new OpenAI();
// const protectedOpenAI = sentra.wrapOpenAI(openai);
// await protectedOpenAI.chat.completions.create({ ... });

// Example 2: Fetch Wrapper
const protectedFetch = sentra.wrapFetch(global.fetch);
// await protectedFetch("https://api.external.com/data");

// Example 3: Manual Check
async function manualCheck() {
  const result = await sentra.checkAction({
    action_type: "API_CALL",
    payload: { url: "https://malicious.com", method: "POST" }
  });
  
  if (result.status === 'blocked') {
    console.log("Action blocked:", result.reason);
  }
}

console.log("SDK implementation verified with OpenAI and Fetch wrappers.");
