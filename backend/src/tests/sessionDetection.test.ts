import prisma, { initializePrisma } from '../config/db';
import { makeDecision } from '../services/decisionEngine';
import { SessionDetectionService } from '../services/sessionDetection.service';

describe('AIDR Detection Depth Lite (Session-Pattern Detection) Tests', () => {
  const ORG_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await initializePrisma();
    await prisma.organizations.upsert({
      where: { id: ORG_ID },
      update: { aidrEnforcementMode: 'BLOCK' },
      create: {
        id: ORG_ID,
        name: 'Sentra Session Test Org',
        slug: 'sentra-session-test',
        is_active: true,
        aidrEnforcementMode: 'BLOCK',
      },
    });
  });

  // --- Positive Tests ---
  it('should detect Exfiltration Pattern when sensitive read is followed by external call in same session', async () => {
    const agent = 'Exfil-Agent-1';
    SessionDetectionService.clearSession(agent, ORG_ID);

    // Action 1: Read customer PHI
    const dec1 = await makeDecision(agent, 'read_s3 customer phi medical records', ORG_ID);
    expect(dec1.status).toBe('allowed');

    // Action 2: Call external webhook
    const dec2 = await makeDecision(agent, 'http_post to partner-webhook.external.com/upload', ORG_ID);
    expect(dec2.status).toBe('blocked');
    expect(dec2.detectionSource).toBe('session_pattern');
    expect(dec2.reason.toLowerCase()).toContain('exfiltration');
  });

  it('should detect Rapid Scope Probing when 3+ distinct tool scopes are touched in < 2 mins', async () => {
    const agent = 'Probing-Agent-2';
    SessionDetectionService.clearSession(agent, ORG_ID);

    await makeDecision(agent, 'sql:get_users', ORG_ID);
    await makeDecision(agent, 's3:get_policy', ORG_ID);
    const dec3 = await makeDecision(agent, 'slack:send_msg', ORG_ID);

    expect(dec3.status).toBe('blocked');
    expect(dec3.detectionSource).toBe('session_pattern');
    expect(dec3.reason.toLowerCase()).toContain('probing');
  });

  it('should detect Tool-Call Pattern Deviation when admin tool is executed in normal session', async () => {
    const agent = 'Deviation-Agent-3';
    SessionDetectionService.clearSession(agent, ORG_ID);

    // Normal actions
    await makeDecision(agent, 'get_user_profile', ORG_ID);
    await makeDecision(agent, 'view_dashboard_metrics', ORG_ID);

    // Sudden admin/dangerous tool
    const dec3 = await makeDecision(agent, 'delete_database all tables', ORG_ID);
    expect(dec3.status).toBe('blocked');
    expect(dec3.detectionSource).toBe('session_pattern');
    expect(dec3.reason.toLowerCase()).toContain('deviation');
  });

  // --- Negative & Edge Case Tests ---
  it('should NOT trigger Exfiltration Pattern when external call occurs in a clean/new session window', async () => {
    const agent = 'Exfil-Neg-Agent';
    SessionDetectionService.clearSession(agent, ORG_ID);

    // Sensitive read
    await makeDecision(agent, 'read_s3 customer phi medical records', ORG_ID);

    // Session cleared / expired
    SessionDetectionService.clearSession(agent, ORG_ID);

    // External call in new session
    const dec = await makeDecision(agent, 'http_post to partner-webhook.external.com/upload', ORG_ID);
    expect(dec.detectionSource).toBe('single_action');
    expect(dec.reason).not.toContain('Exfiltration');
  });

  it('should NOT trigger Rapid Scope Probing when boundary is only 2 distinct scopes (legitimate multi-tool usage)', async () => {
    const agent = 'Probing-Boundary-Agent';
    SessionDetectionService.clearSession(agent, ORG_ID);

    await makeDecision(agent, 'sql:get_users', ORG_ID);
    await makeDecision(agent, 'sql:get_orders', ORG_ID);
    const dec3 = await makeDecision(agent, 's3:get_policy', ORG_ID); // Only 2 distinct tool prefixes: 'sql' and 's3'

    expect(dec3.detectionSource).toBe('single_action');
    expect(dec3.reason).not.toContain('Probing');
  });

  it('should NOT trigger Tool Deviation when agent role baseline already includes admin operations', async () => {
    const agent = 'Admin-Role-Agent';
    SessionDetectionService.clearSession(agent, ORG_ID);

    // Session baseline already includes admin operations
    await makeDecision(agent, 'grant_admin role', ORG_ID);

    // Subsequent admin action
    const dec2 = await makeDecision(agent, 'delete_database old_logs', ORG_ID);
    expect(dec2.sessionRule).not.toBe('TOOL_DEVIATION');
  });
});
