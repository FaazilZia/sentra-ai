import fs from 'fs';
import path from 'path';
import { SentraClient } from '@sentra-ai/sdk';

describe('SDK Example Scripts & Client Smoke Test', () => {
  const examplesDir = path.resolve(__dirname, '../../../../examples');

  it('should export SentraClient constructor from @sentra-ai/sdk', () => {
    expect(SentraClient).toBeDefined();
    expect(typeof SentraClient).toBe('function');
  });

  it('should instantiate SentraClient with valid config', () => {
    const client = new SentraClient({
      apiKey: 'demo-api-key',
      baseUrl: 'http://localhost:3000/api'
    });

    expect(client).toBeInstanceOf(SentraClient);
    expect(typeof client.checkAction).toBe('function');
    expect(typeof client.safeAction).toBe('function');
    expect(typeof client.wrapOpenAI).toBe('function');
    expect(typeof client.wrapFetch).toBe('function');
    expect(typeof client.wrapLangChain).toBe('function');
  });

  it('should verify examples/openai-agent.js imports and instantiates SentraClient', () => {
    const filePath = path.join(examplesDir, 'openai-agent.js');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Assert SentraClient is imported and Sentra is not imported as a class
    expect(content).toContain('const { SentraClient }');
    expect(content).toContain('new SentraClient({');
    expect(content).not.toMatch(/const\s+\{\s*Sentra\s*\}\s*=/);
    expect(content).not.toMatch(/new\s+Sentra\s*\(/);
  });

  it('should verify examples/api-call-protection.js imports and instantiates SentraClient', () => {
    const filePath = path.join(examplesDir, 'api-call-protection.js');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('const { SentraClient }');
    expect(content).toContain('new SentraClient({');
    expect(content).not.toMatch(/const\s+\{\s*Sentra\s*\}\s*=/);
    expect(content).not.toMatch(/new\s+Sentra\s*\(/);
  });

  it('should verify examples/email-protection.js imports and instantiates SentraClient', () => {
    const filePath = path.join(examplesDir, 'email-protection.js');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('const { SentraClient }');
    expect(content).toContain('new SentraClient({');
    expect(content).not.toMatch(/const\s+\{\s*Sentra\s*\}\s*=/);
    expect(content).not.toMatch(/new\s+Sentra\s*\(/);
  });
});
