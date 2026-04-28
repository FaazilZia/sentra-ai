# @sentra-ai/sdk

Enterprise-grade SDK for real-time AI governance and runtime security. Intercept AI actions, enforce policies, and detect semantic risks before they reach your models.

## Quickstart

```typescript
import { interceptAction } from '@sentra-ai/sdk';

const result = await interceptAction({ agent: 'support-bot', action: 'send_email' }, async () => {
  return await myAI.execute('send_email');
});
console.log('Decision:', result.status); // 'allowed' | 'blocked'
```

## Features

- **Multi-tier Governance**: L1 Policy, L2 Pattern, and L3 Semantic analysis.
- **Fail-Closed Security**: Actions are blocked by default if governance fails.
- **Zero Latency (almost)**: Optimized for real-time interception.
- **Audit Ready**: Full transparency into why actions were allowed or blocked.

## Installation

```bash
npm install @sentra-ai/sdk
```

## License

MIT © Sentra AI Team
