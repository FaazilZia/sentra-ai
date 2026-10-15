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

You can immediately test runtime governance using the built-in sandbox API key:

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ 
  apiKey: 'sentra_test_sandbox' 
});

// Immediately test a real BLOCKED action
const decision = await sentra.demoBlockedAction();
console.log(decision);
// { status: 'blocked', risk: 'high', reason: 'Action blocked: potentially sensitive data or restricted pattern detected', ... }
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

if (result.status === 'blocked') {
  console.warn('Blocked by Sentra:', result.reason);
} else {
  await exportToS3(...);
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

* **Non-Transient Errors (401, 403, 400):** Immediately fail closed with actionable plain-language explanations. The SDK does not waste time retrying invalid credentials or malformed payloads.
* **Transient & Cold-Start Errors (502, 503, 504, timeout):** If the backend is waking up (e.g., Render cold start), the SDK retries automatically with exponential backoff and friendly status logging.
* **Unreachable Service:** If all retries fail, Sentra fails closed (`status: 'blocked'`), preventing silent governance bypasses.

---

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Your Sentra API key, or `'sentra_test_sandbox'` for demo mode |
| `baseUrl` | `string` | `https://sentra-backend-node.onrender.com/api/v1` | Governance API endpoint URL |
| `sandbox` | `boolean` | `false` | Force sandbox mode (auto-enabled if using test/demo keys) |
| `maxRetries` | `number` | `3` | Retries on transient network/cold-start failures |
| `timeout` | `number` | `8000` | Request timeout in milliseconds |

---

## License

MIT © Sentra AI Team
