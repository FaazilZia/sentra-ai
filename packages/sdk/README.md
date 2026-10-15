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

## OpenAI Wrapper

Wrap the OpenAI SDK client to guard completions automatically:

```typescript
import OpenAI from 'openai';
import { SentraClient } from '@sentra-ai/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sentra = new SentraClient({ apiKey: process.env.SENTRA_API_KEY });

const guardedOpenAI = sentra.wrapOpenAI(openai);

const response = await guardedOpenAI.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarize this contract.' }]
});
```

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
