# @sentra-ai/sdk

Production-ready SDK for real-time AI governance and runtime security.

## Installation

```bash
npm install @sentra-ai/sdk
```

## Quickstart

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ apiKey: 'your_api_key' });
const response = await sentra.checkAction({ agent: 'support-bot', action: 'send_email' });

if (response.status === 'blocked') {
  console.log(`Action blocked: ${response.reason}`);
}
```

## Usage

### checkAction()

Manually check if an action is allowed.

```typescript
const decision = await sentra.checkAction({
  agent: "marketing-genie",
  action: "generate_discount_code",
  metadata: {
    customer_id: "cust_123",
    discount_value: 50
  }
});

if (decision.status === 'allowed') {
  // Execute your logic
} else {
  console.warn(`Blocked by Sentra: ${decision.reason}`);
}
```

### safeAction()

A wrapper that only executes your logic if the action is allowed by Sentra.

```typescript
const result = await sentra.safeAction(
  { agent: "auto-coder", action: "commit_code" },
  async () => {
    // This code only runs if Sentra allows it
    return await git.commit();
  }
);

if (result.success) {
  console.log("Action executed successfully", result.result);
} else {
  console.error("Action blocked", result.governance.reason);
}
```

## Configuration Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | **Required** | Your Sentra AI API key. |
| `baseUrl` | `string` | `https://api.sentra.ai/api/v1` | Custom API base URL. |
| `timeout` | `number` | `5000` | Request timeout in milliseconds. |
| `maxRetries` | `number` | `3` | Number of retries on network failure. |

## License

MIT
