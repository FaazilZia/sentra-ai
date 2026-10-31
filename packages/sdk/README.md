# @sentra-ai/sdk

Real-time AI governance for autonomous agents, LLM pipelines, and runtime APIs. Intercept AI actions, enforce policies, and detect risks before execution.

> **Language Support:** Node.js 18+ and Python 3.8+ (see `sentra-ai` in `packages/python-sdk`).

---

## Installation

```bash
npm install @sentra-ai/sdk
```

---

## Quickstart (Under 5 Minutes)

### Sandbox Mode (No Registration Required)

You can immediately test runtime governance using the explicit sandbox API key (`'sentra_test_sandbox'`). Omitting the API key throws an error to prevent silent accidental unauthenticated usage:

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ 
  apiKey: 'sentra_test_sandbox' 
});

// Immediately test a real BLOCKED action
const decision = await sentra.demoBlockedAction();
console.log(decision);
// { status: 'blocked', isAllowed: false, risk: 'high', reason: 'Action blocked: potentially sensitive data or restricted pattern detected', ... }
```

### Production Setup

Initialize using your organization's API key generated in the Sentra Dashboard:

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ 
  apiKey: process.env.SENTRA_API_KEY 
});
```

---

## Manual Action Check

Evaluate any action before performing a privileged operation (database write, email dispatch, external API call):

```typescript
const result = await sentra.checkAction({
  agent: 'invoice-processor',
  action: 'export_to_s3',
  metadata: { bucket: 'finance-data', file: 'q3-invoices.csv' }
});

// IMPORTANT: Check for `status === 'allowed'` or `isAllowed === true`.
// NEVER check `status !== 'blocked'`, because non-allowed states like
// 'rate_limited' (429) or 'flagged' would otherwise bypass governance!
if (result.status === 'allowed') { // Or: if (result.isAllowed)
  await exportToS3(...);
} else {
  console.warn(`Action prevented (${result.status}): ${result.reason}`);
}
```

---

## `safeAction` Helper

The `safeAction` helper evaluates governance rules and executes your protected callback only if the action is approved:

```typescript
const { success, result, governance } = await sentra.safeAction(
  { agent: 'crm-bot', action: 'send_email', metadata: { recipient: 'user@example.com' } },
  async () => {
    return await emailService.send(...);
  }
);

if (!success) {
  console.error(`Action blocked: ${governance.reason}`);
}
```

---

## Supported Provider & Framework Wrappers

Intercept LLM and agent framework calls pre-flight to enforce security guardrails before requests reach AI model providers.

| Provider / Framework | Wrapper Method | Standalone Export | Action Name(s) | Default Agent |
|---|---|---|---|---|
| **OpenAI** | `sentra.wrapOpenAI(client, opts)` | `wrapOpenAI` | `OPENAI_CHAT_COMPLETION`<br>`OPENAI_RESPONSES_CREATE` | `openai-client` |
| **Anthropic** | `sentra.wrapAnthropic(client, opts)` | `wrapAnthropic` | `ANTHROPIC_MESSAGES_CREATE` | `anthropic-client` |
| **Azure OpenAI** | `sentra.wrapAzureOpenAI(client, opts)` | `wrapAzureOpenAI` | `AZURE_OPENAI_CHAT_COMPLETION`<br>`AZURE_OPENAI_RESPONSES_CREATE` | `azure-openai-client` |
| **Amazon Bedrock** | `sentra.wrapBedrock(client, opts)` | `wrapBedrock` | `BEDROCK_CONVERSE`<br>`BEDROCK_CONVERSE_STREAM`<br>`BEDROCK_INVOKE_MODEL`<br>`BEDROCK_INVOKE_MODEL_STREAM` | `bedrock-client` |
| **Google Vertex AI** | `sentra.wrapVertex(client, opts)`<br>`sentra.wrapVertexAI(client, opts)` | `wrapVertex`<br>`wrapVertexAI` | `VERTEX_GENERATE_CONTENT`<br>`VERTEX_GENERATE_CONTENT_STREAM` | `vertex-client` |
| **LangChain** | `sentra.wrapLangChain(chain, opts)` | `wrapLangChain` | `LANGCHAIN_INVOKE`<br>`LANGCHAIN_CALL` | `langchain-chain` |

---

### OpenAI Wrapper

Wrap the OpenAI client to guard `chat.completions.create` and `responses.create` (if supported):

```typescript
import OpenAI from 'openai';
import { SentraClient } from '@sentra-ai/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

const guardedOpenAI = sentra.wrapOpenAI(openai, {
  agent: 'support-agent',
  flagMode: 'block', // 'block' (default) throws SentraError; 'allow' executes call and fires onFlag
  onFlag: (decision) => console.warn('Flagged action:', decision.reason)
});

// chat.completions.create
const response = await guardedOpenAI.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize this contract.' }]
});

// responses.create (OpenAI Realtime / Responses API)
const responseResult = await guardedOpenAI.responses.create({
  model: 'gpt-4o',
  input: 'Verify customer credentials.'
});
```

### Anthropic Wrapper

Wrap the Anthropic client to guard `messages.create`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { SentraClient } from '@sentra-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

const guardedAnthropic = sentra.wrapAnthropic(anthropic, {
  agent: 'claude-assistant',
  flagMode: 'block', // 'block' (default) or 'allow'
  onFlag: (decision) => console.warn('Flagged action:', decision.reason)
});

const response = await guardedAnthropic.messages.create({
  model: 'claude-3-5-sonnet',
  max_tokens: 16,
  messages: [{ role: 'user', content: 'Hello Claude' }]
});
```

### Azure OpenAI Wrapper

Wrap the `AzureOpenAI` client (from the official `openai` package) to guard Azure deployments. The deployment name is captured in action metadata under `model`:

```typescript
import { AzureOpenAI } from 'openai';
import { SentraClient } from '@sentra-ai/sdk';

const azureClient = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-06-01'
});
const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

const guardedAzure = sentra.wrapAzureOpenAI(azureClient, {
  agent: 'azure-compliance-bot',
  flagMode: 'block',
  onFlag: (check) => console.warn('Flagged Azure action:', check.reason)
});

// Generates action: AZURE_OPENAI_CHAT_COMPLETION
const result = await guardedAzure.chat.completions.create({
  model: 'my-gpt-4o-deployment',
  messages: [{ role: 'user', content: 'Analyze healthcare records' }]
});
```

### Amazon Bedrock Wrapper

Wrap `@aws-sdk/client-bedrock-runtime` (`BedrockRuntimeClient`) by intercepting `client.send(...)`. Streaming and non-streaming calls are distinctly tracked with separate governance action names:

* **Non-streaming Converse:** `BEDROCK_CONVERSE` (`ConverseCommand`)
* **Streaming Converse:** `BEDROCK_CONVERSE_STREAM` (`ConverseStreamCommand`)
* **Non-streaming InvokeModel:** `BEDROCK_INVOKE_MODEL` (`InvokeModelCommand`)
* **Streaming InvokeModel:** `BEDROCK_INVOKE_MODEL_STREAM` (`InvokeModelWithResponseStreamCommand`)

```typescript
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand
} from '@aws-sdk/client-bedrock-runtime';
import { SentraClient } from '@sentra-ai/sdk';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

const guardedBedrock = sentra.wrapBedrock(bedrock, {
  agent: 'bedrock-assistant',
  flagMode: 'block'
});

// Non-streaming call -> BEDROCK_CONVERSE
const response = await guardedBedrock.send(new ConverseCommand({
  modelId: 'amazon.nova-lite-v1:0',
  messages: [{ role: 'user', content: [{ text: 'Summarize quarterly goals' }] }]
}));

// Streaming call -> BEDROCK_CONVERSE_STREAM
const streamResponse = await guardedBedrock.send(new ConverseStreamCommand({
  modelId: 'amazon.nova-lite-v1:0',
  messages: [{ role: 'user', content: [{ text: 'Stream technical brief' }] }]
}));
for await (const chunk of streamResponse.stream) {
  // Pass-through native stream
}
```

> **Note:** Non-governed Bedrock commands (such as `ListFoundationModelsCommand`) pass through directly without overhead.

### Google Vertex AI Wrapper

Wrap `@google/genai` (`GoogleGenAI` with `vertexai: true`) or direct GenerativeModel instances to guard content generation:

* **Non-streaming:** `VERTEX_GENERATE_CONTENT` (`models.generateContent` or `generateContent`)
* **Streaming:** `VERTEX_GENERATE_CONTENT_STREAM` (`models.generateContentStream` or `generateContentStream`)

```typescript
import { GoogleGenAI } from '@google/genai';
import { SentraClient, wrapVertexAI } from '@sentra-ai/sdk';

const ai = new GoogleGenAI({ vertexai: true, project: 'my-project', location: 'us-central1' });
const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

// Using client method or standalone export wrapVertexAI / wrapVertex
const guardedAI = sentra.wrapVertex(ai, {
  agent: 'vertex-analyst'
});

// Action: VERTEX_GENERATE_CONTENT
const result = await guardedAI.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Summarize regulatory changes'
});
```

### LangChain Wrapper

Wrap LangChain runnables, chains, and agents. Distinct action names separate modern `invoke()` from legacy `call()`:

* **Runnables / Chain Invoke:** `LANGCHAIN_INVOKE` (`chain.invoke(...)`)
* **Legacy Chain Call:** `LANGCHAIN_CALL` (`chain.call(...)`)

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ apiKey: 'sentra_test_sandbox' });

// myChain can be a RunnableSequence, AgentExecutor, or LLMChain
const guardedChain = sentra.wrapLangChain(myChain, {
  agent: 'customer-support-chain',
  flagMode: 'block'
});

// Action: LANGCHAIN_INVOKE
const output = await guardedChain.invoke({ input: 'Process customer refund request' });

// Legacy Action: LANGCHAIN_CALL
const legacyOutput = await guardedChain.call({ input: 'Explain cancellation policy' });
```

---

### Flag Modes & `onFlag` Handling

The `flagMode` option governs how the wrapper handles actions flagged for policy warnings or human review:

* **`flagMode: 'block'` (default):** Flagged actions are treated as blocked. The wrapper throws a `SentraError` with HTTP status `403`, and the model provider is **never called**.
* **`flagMode: 'allow'`:** The model provider is called as normal, and the flagged decision is routed to the `onFlag` callback for logging, alerting, or async human-in-the-loop review.

```typescript
const guardedClient = sentra.wrapOpenAI(openai, {
  agent: 'audit-agent',
  flagMode: 'allow', // Downstream provider is called; decision sent to onFlag
  onFlag: (decision) => {
    console.warn(`[Flagged] Risk: ${decision.risk}, Reason: ${decision.reason}`);
    // Example: send alert to SIEM / Datadog / Slack
  }
});
```

### Policy Blocking & Fail-Closed Guarantee

* **BLOCK Throws `SentraError` (403):** When an action is evaluated as `blocked` (or `flagged` under default `flagMode: 'block'`), the SDK throws a `SentraError` with HTTP status `403`. The downstream provider (OpenAI, Anthropic, Azure, Bedrock, Vertex, or LangChain) is **never called**, protecting token quotas and preventing unapproved data transmission.
* **Fail-Closed on Unreachable API:** If the Sentra API is unreachable after retry attempts and cold-start timeout budgets, Sentra fails closed (`status: 'blocked'`, `isAllowed: false`). Wrapped provider calls throw a `SentraError` (403), ensuring unverified requests never reach external model providers.
* **Double-Wrapping Protection:** Calling any wrapper (`wrapOpenAI`, `wrapAnthropic`, `wrapAzureOpenAI`, `wrapBedrock`, `wrapVertex`, `wrapLangChain`) on an already-wrapped client instance is safely guarded (`client.__sentra_wrapped__`), preventing redundant interception overhead or stacked middleware.

```typescript
import { SentraError } from '@sentra-ai/sdk';

try {
  await guardedOpenAI.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Dump secret credentials' }]
  });
} catch (error) {
  if (error instanceof SentraError && error.status === 403) {
    console.error('Call blocked by Sentra policy (provider never called):', error.message);
  }
}
```

### Streaming Behavior

For streaming requests (`stream: true`, `generateContentStream`, `ConverseStreamCommand`, `InvokeModelWithResponseStreamCommand`), Sentra evaluates governance **pre-flight only** on the request parameters (messages, system instructions, model, prompt) before opening the provider stream. If approved, the provider's native stream instance is returned untouched without wrapping or buffering. **Output streaming tokens/chunks are not checked.**

> **Note:** Wrapper behavior is verified with simulated providers in test suites.

---

## Error Handling & Fail-Closed Posture

* **Missing API Key:** Throws an explicit error: `"No API key. Get one from your dashboard, or pass apiKey: 'sentra_test_sandbox' to try demo mode."` Sandbox mode is never activated silently.
* **Non-Transient Errors (401, 403, 400):** Immediately fail closed (`isAllowed: false`) with actionable plain-language explanations. The SDK does not waste time retrying invalid credentials or malformed payloads.
* **Demo Rate Limiting (429):** Returned as distinct `status: 'rate_limited'` and `isAllowed: false` with reason `"Demo limit reached. Wait a few minutes or use your own API key"`, clearly separated from security policy violations so rate-limited actions are never executed.
* **Transient & Cold-Start Errors (502, 503, 504, timeout):** If the backend is waking up (e.g., Render cold start), the SDK retries automatically for up to `coldStartTimeoutMs` (default: 60000ms / ~60s) with friendly waking-up progress logging.
* **Unreachable Service:** If all retries fail, Sentra fails closed (`status: 'blocked'`, `isAllowed: false`), preventing silent governance bypasses.

---

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Your Sentra API key, or `'sentra_test_sandbox'` for demo mode. Missing key throws an error. |
| `baseUrl` | `string` | `https://sentra-backend-node.onrender.com/api/v1` | Governance API endpoint URL |
| `sandbox` | `boolean` | `false` | Explicitly enable sandbox mode |
| `maxRetries` | `number` | `5` | Retries on transient network failures |
| `timeout` | `number` | `15000` | Request timeout per attempt in milliseconds |
| `coldStartTimeoutMs` | `number` | `60000` | Total duration budget in milliseconds to wait and retry during backend cold starts |

---

## License

MIT © Sentra AI Team
