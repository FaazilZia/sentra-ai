# @sentra-ai/sdk

Real-time AI governance for LangChain, OpenAI, and custom agents. Intercept AI actions, enforce policies, and detect semantic risks before they reach your models.

## Installation

```bash
npm install @sentra-ai/sdk
```

## Setup

Initialize the Sentra client using your API key. By default, it communicates with the cloud governance engine.

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ 
  apiKey: process.env.SENTRA_API_KEY 
});
```

## OpenAI wrapper

Add runtime security to your OpenAI completions with a simple 3-line wrapper integration. Intercept prompts, evaluate them against active policies, and block unsafe prompt injections or compliance violations before they hit the model.

```typescript
import OpenAI from 'openai';
import { SentraClient } from '@sentra-ai/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sentra = new SentraClient({ apiKey: process.env.SENTRA_API_KEY });

// Wrap once — all completions now go through Sentra governance
const guardedOpenAI = sentra.wrapOpenAI(openai);

// Use exactly like the normal OpenAI client
const response = await guardedOpenAI.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarize this contract.' }]
});
```

## LangChain wrapper

Secure your autonomous LangChain chains and agents. The wrapper automatically intercepts chain invocations, parses parameters, and evaluates them against organizational compliance bounds.

```typescript
import { LLMChain } from 'langchain/chains';
import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({ apiKey: process.env.SENTRA_API_KEY });
const chain = new LLMChain({ llm, prompt });

// Wrap the chain — all invocations evaluated before execution
const guardedChain = sentra.wrapLangChain(chain);
const result = await guardedChain.invoke({ input: 'Draft an NDA for Acme Corp.' });
```

## Manual action check

For custom architectures, trigger manual governance checks before performing privileged actions (e.g. database operations, file exports, or external API integration calls).

```typescript
const result = await sentra.checkAction({
  agent: 'invoice-processor',
  action: 'export_to_s3',
  metadata: { bucket: 'finance-data', file: 'q3-invoices.csv' }
});

if (result.status === 'blocked') {
  console.warn('Blocked:', result.reason);
} else {
  await exportToS3(...);
}
```

## safeAction helper

The `safeAction` helper wraps governance checks and the corresponding operation execution in a single, robust transaction. The callback only executes if the Sentra engine verifies the action.

```typescript
const { success, result } = await sentra.safeAction(
  { agent: 'crm-bot', action: 'send_email', metadata: { recipient: 'ceo@customer.com' } },
  () => emailService.send(...)
);
```

## Fail-closed behaviour

Sentra enforces a strict security posture. If the Sentra API is unreachable after all retries or if a transient server error occurs, the SDK blocks the action by default (fails closed). This prevents silent governance pass-throughs, ensuring your enterprise systems are always protected even during upstream network disruptions.

## Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Your Sentra API key |
| `baseUrl` | `string` | `https://sentra-backend-node.onrender.com/api/v1` | Override for self-hosted |
| `maxRetries` | `number` | `3` | Retries on transient failures |
| `timeout` | `number` | `5000` | Request timeout in ms |

## License

MIT © Sentra AI
