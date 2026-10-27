# @sentra-ai/sdk

Real-time AI governance for autonomous agents, LLM pipelines, and runtime APIs. Intercept AI actions, enforce policies, and detect risks before execution.

> **Language Support:** Node.js 18+. Python is not yet supported.

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

## Provider Wrappers (OpenAI & Anthropic)

Intercept LLM calls pre-flight to enforce security guardrails before requests reach AI model providers.

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

const response = await guardedOpenAI.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize this contract.' }]
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

### Streaming Behavior

For streaming requests (`stream: true`), Sentra evaluates governance **pre-flight only** on the request parameters (messages, system instructions, model) before opening the provider stream. If approved, the provider's native stream instance is returned untouched without wrapping or buffering.

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
