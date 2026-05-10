# @sentra-ai/sdk

Enterprise-grade SDK for real-time AI governance and runtime security. Intercept AI actions, enforce policies, and detect semantic risks before they reach your models.

## Quickstart

```typescript
import { SentraClient, SentraError } from '@sentra-ai/sdk';

const client = new SentraClient({ 
  apiKey: 'your_api_key' 
});

try {
  const result = await client.checkAction({
    agent: 'support-bot',
    action: 'send_email',
    metadata: { recipient: 'user@example.com' }
  });

  if (result.status === 'allowed') {
    // Proceed with action
    console.log('Action allowed:', result.reason);
  } else {
    // Handle block
    console.warn('Action blocked:', result.reason);
  }
} catch (error) {
  if (error instanceof SentraError) {
    console.error(`Sentra API Error: ${error.message} (${error.status})`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Resilience & Rate Limiting

- **Automatic Retries**: The SDK automatically retries transient network errors with exponential backoff.
- **Fail-Closed Strategy**: If the Sentra API is unreachable after all retries, the SDK will return a `blocked` status by default to ensure system safety.
- **Rate Limit Behavior**: When rate limits are exceeded, the API returns a 429 status. The SDK handles this as a transient error and will retry. If exhausted, it follows the fail-closed strategy.

## Installation

```bash
npm install @sentra-ai/sdk
```

## License

MIT © Sentra AI Team
