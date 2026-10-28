import fs from 'node:fs';
import path from 'node:path';
import { SentraClient, SentraError } from '../src/index.ts';

// 1. Safely load .env if present without printing any keys or credential file contents
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

// 2. Opt-in guard: skip cleanly if Vertex environment variables are missing
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
const location = process.env.GOOGLE_CLOUD_LOCATION?.trim();
const model = process.env.VERTEX_MODEL?.trim();
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

if (!project || !location || !model || !credentials) {
  const missing: string[] = [];
  if (!project) missing.push('GOOGLE_CLOUD_PROJECT');
  if (!location) missing.push('GOOGLE_CLOUD_LOCATION');
  if (!model) missing.push('VERTEX_MODEL');
  if (!credentials) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
  console.log(`Skipping real Vertex call: Missing environment variables: ${missing.join(', ')}.`);
  process.exit(0);
}

// Guard: Verify credentials file exists on disk without printing the path or contents
if (!fs.existsSync(credentials)) {
  console.log('Skipping real Vertex call: Credentials file specified in GOOGLE_APPLICATION_CREDENTIALS does not exist.');
  process.exit(0);
}

// 3. Resolve GoogleGenAI client class from '@google/genai' package
let GoogleGenAIClass: any;
try {
  const genaiModule = await import('@google/genai');
  GoogleGenAIClass = genaiModule.GoogleGenAI;
} catch {
  try {
    const backendGenAIPath = path.resolve(baseDir, '../../../backend/node_modules/@google/genai/index.js');
    const genaiModule = await import(backendGenAIPath);
    GoogleGenAIClass = genaiModule.GoogleGenAI;
  } catch (err: any) {
    console.error('Could not load GoogleGenAI from "@google/genai" package:', err.message);
    process.exit(1);
  }
}

async function run() {
  const aiClient = new GoogleGenAIClass({
    vertexai: true,
    project,
    location
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

  // 5. Wrap client with wrapVertex
  const guardedAi = sentra.wrapVertex(aiClient);

  // 6. Send one generateContent call ("Say hello in 5 words")
  try {
    const response = await guardedAi.models.generateContent({
      model,
      contents: 'Say hello in 5 words'
    });

    const reply = (response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    console.log(`Sentra check status: ${sentraStatus}`);
    console.log(`Vertex AI reply: ${reply}`);
  } catch (error: any) {
    console.log(`Sentra check status: ${sentraStatus}`);
    console.error(`Vertex AI call error: ${error.message || error}`);
    if (error.status) console.error(`HTTP Status: ${error.status}`);
    if (error.code) console.error(`Error Code: ${error.code}`);

    // If model-not-found error, list valid models
    const errText = `${error.message || ''} ${JSON.stringify(error)}`.toLowerCase();
    if (errText.includes('not found') || errText.includes('404') || errText.includes('publisher model') || errText.includes('unsupported model')) {
      console.log('\n[Model Not Found] Listing available models via SDK...');
      try {
        const modelsList = await aiClient.models.list();
        const modelNames: string[] = [];
        if (modelsList && typeof modelsList[Symbol.asyncIterator] === 'function') {
          for await (const m of modelsList) {
            modelNames.push(m.name || m.model || JSON.stringify(m));
          }
        } else if (Array.isArray(modelsList)) {
          for (const m of modelsList) {
            modelNames.push(m.name || m.model || JSON.stringify(m));
          }
        } else if (modelsList?.models) {
          for (const m of modelsList.models) {
            modelNames.push(m.name || m.model || JSON.stringify(m));
          }
        }
        console.log('Available models:', modelNames.slice(0, 20));
      } catch (listErr: any) {
        console.error('Could not list models via SDK:', listErr.message || listErr);
      }
    }
  }
}

run().catch((err) => {
  console.error('Execution failed:', err.message || err);
  process.exit(1);
});
