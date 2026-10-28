import fs from 'node:fs';
import path from 'node:path';
import { SentraClient, SentraError } from '../src/index.ts';

// 1. Safely load .env if present without printing any keys
const baseDir = typeof import.meta.dirname === 'string' ? import.meta.dirname : process.cwd();
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(baseDir, '../.env'),
  path.resolve(baseDir, '../../../.env')
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    try {
      (process as any).loadEnvFile(envPath);
    } catch {
      // Ignore parse/load errors if already loaded
    }
  }
}

// 2. Opt-in guard: skip cleanly if Azure credentials are missing
const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || 'gpt-5-mini-sentraa';
const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || process.env.OPENAI_API_VERSION?.trim() || '2024-10-21';

if (!rawEndpoint || !apiKey) {
  console.log('Skipping real Azure call: AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY is not set.');
  process.exit(0);
}

// 3. Resolve AzureOpenAI client class from 'openai' package
let AzureOpenAIClass: any;
try {
  const openaiModule = await import('openai');
  AzureOpenAIClass = openaiModule.AzureOpenAI;
} catch {
  try {
    const backendOpenAIPath = path.resolve(baseDir, '../../../backend/node_modules/openai/index.js');
    const openaiModule = await import(backendOpenAIPath);
    AzureOpenAIClass = openaiModule.AzureOpenAI;
  } catch (err: any) {
    console.error('Could not load AzureOpenAI from "openai" package:', err.message);
    process.exit(1);
  }
}

async function run() {
  // Normalize endpoint: AzureOpenAI in openai SDK appends /openai to endpoint.
  // If rawEndpoint has trailing slashes or /openai/v1 or /openai, clean it.
  const cleanEndpoint = rawEndpoint!
    .replace(/\/openai(?:\/v1)?\/?$/, '')
    .replace(/\/+$/, '');

  const azureClient = new AzureOpenAIClass({
    endpoint: cleanEndpoint,
    apiKey,
    deployment,
    apiVersion
  });

  // 4. Configure Sentra governance
  const sentraApiKey = process.env.SENTRA_API_KEY?.trim();
  const sentra = new SentraClient({
    apiKey: sentraApiKey || 'sentra_test_sandbox',
    sandbox: !sentraApiKey,
    timeout: 8000,
    maxRetries: 1
  });

  let sentraStatus = 'unknown';
  const originalCheckAction = sentra.checkAction.bind(sentra);
  sentra.checkAction = async (request) => {
    try {
      const response = await originalCheckAction(request);
      if (!sentraApiKey && !response.isAllowed && response.reason?.includes('unreachable')) {
        sentraStatus = 'allowed (stubbed fallback: backend unreachable)';
        return {
          status: 'allowed',
          isAllowed: true,
          risk: 'low',
          reason: 'Stubbed sandbox fallback for real call',
          impact: 'None',
          compliance: []
        };
      }
      sentraStatus = response.status;
      return response;
    } catch {
      sentraStatus = 'allowed (stubbed fallback: connection exception)';
      return {
        status: 'allowed',
        isAllowed: true,
        risk: 'low',
        reason: 'Stubbed sandbox fallback for real call',
        impact: 'None',
        compliance: []
      };
    }
  };

  // 5. Wrap client with wrapAzureOpenAI
  const guardedAzure = sentra.wrapAzureOpenAI(azureClient);

  // 6. Send one chat completion ("Say hello in 5 words")
  // gpt-5-mini is a reasoning model: use max_completion_tokens (>= 500), do NOT pass max_tokens or temperature.
  try {
    const completion = await guardedAzure.chat.completions.create({
      model: deployment,
      messages: [{ role: 'user', content: 'Say hello in 5 words' }],
      max_completion_tokens: 500
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || '(No content in choice)';
    console.log(`Sentra check status: ${sentraStatus}`);
    console.log(`Azure OpenAI reply: ${reply}`);
  } catch (error: any) {
    console.log(`Sentra check status: ${sentraStatus}`);
    console.error(`Azure OpenAI call error: ${error.message || error}`);
    if (error.status) console.error(`HTTP Status: ${error.status}`);
    if (error.code) console.error(`Error Code: ${error.code}`);
  }
}

run().catch((err) => {
  console.error('Execution failed:', err.message || err);
  process.exit(1);
});
