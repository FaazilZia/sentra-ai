# @sentra/sdk

The official TypeScript SDK for **Sentra AI** — the real-time governance layer for AI Agents.

## Installation

```bash
npm install @sentra/sdk
```

## Usage

### Initialize
```typescript
import { Sentra } from '@sentra/sdk';

const sentra = new Sentra({
  apiKey: process.env.SENTRA_API_KEY
});
```

### Protect Actions (Recommended)
Use `safeAction` to wrap your agent's execution logic. It ensures the code only runs if the action passes governance checks.

```typescript
const result = await sentra.safeAction({
  agent: "financial-assistant",
  action: "read_customer_data",
  metadata: { customerId: "123" }
}, async () => {
  // Your sensitive logic here
  return await db.customers.findUnique({ where: { id: "123" } });
});

if (!result.success) {
  console.log("Blocked by Sentra:", result.governance.reason);
}
```

### Check Only
Use `checkAction` if you just need the governance decision without wrapping logic.

```typescript
const decision = await sentra.checkAction({
  agent: "support-bot",
  action: "external_api_call"
});

console.log(decision.status); // 'allowed' | 'blocked'
```
