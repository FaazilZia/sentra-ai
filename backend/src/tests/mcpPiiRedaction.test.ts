import { PIIScannerService } from '../services/piiScanner.service';
import { processAlertJob, DecisionAlertEvent } from '../services/alertPipeline.service';
import { SlackService } from '../services/slack.service';
import { McpController } from '../controllers/mcp.controller';
import { McpAgentKeyService } from '../services/mcpAgentKey.service';
import * as decisionEngine from '../services/decisionEngine';
import prisma from '../config/db';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    mcp_audit_logs: {
      create: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    },
    incidents: {
      create: jest.fn().mockResolvedValue({ id: 'incident-1' }),
    },
    interception_logs: {
      create: jest.fn().mockResolvedValue({ id: 'interception-1' }),
    },
    organizations: {
      findUnique: jest.fn().mockResolvedValue({ id: 'test-org-1', alertEmail: null, name: 'Test Org' }),
    },
    slack_config: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'cfg-1',
        orgId: 'test-org-1',
        webhookUrl: 'https://hooks.slack.com/services/mock/valid/url',
        channel: '#sentraa-alerts',
        enabled: true,
        notifyOn: ['guardrail_block', 'policy_violation', 'block', 'flag']
      })
    }
  }
}));

jest.mock('../services/slack.service', () => ({
  SlackService: {
    notifyDecisionEvent: jest.fn().mockResolvedValue(true),
    getConfig: jest.fn().mockResolvedValue({
      id: 'cfg-1',
      orgId: 'test-org-1',
      webhookUrl: 'https://hooks.slack.com/services/mock/valid/url',
      channel: '#sentraa-alerts',
      enabled: true,
      notifyOn: ['guardrail_block', 'policy_violation', 'block', 'flag']
    })
  }
}));

describe('Privacy & PII Redaction in MCP and Alert Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PIIScannerService Redaction Utilities', () => {
    it('redacts raw SSN and credit card from plain string', () => {
      const rawText = 'Export records containing SSN 987-65-4321 and credit card 4111-2222-3333-4444 to external csv';
      const redacted = PIIScannerService.redact(rawText);

      expect(redacted).not.toContain('987-65-4321');
      expect(redacted).not.toContain('4111-2222-3333-4444');
      expect(redacted).toContain('[SSN_REDACTED]');
      expect(redacted).toContain('[CARD_REDACTED]');
    });

    it('redacts nested object and array payloads recursively without mutating non-string types', () => {
      const payload = {
        action: 'Export customer SSN 987-65-4321',
        metadata: {
          department: 'CustomerSupport',
          ssn: '987-65-4321',
          cards: ['4111-2222-3333-4444', '5500-0000-0000-0004'],
          count: 42,
          active: true
        }
      };

      const redacted = PIIScannerService.redactDeep(payload);

      expect(redacted.action).toContain('[SSN_REDACTED]');
      expect(redacted.action).not.toContain('987-65-4321');
      expect(redacted.metadata.ssn).toBe('[SSN_REDACTED]');
      expect(redacted.metadata.cards[0]).toBe('[CARD_REDACTED]');
      expect(redacted.metadata.count).toBe(42);
      expect(redacted.metadata.active).toBe(true);
    });
  });

  describe('Alert Pipeline Outbound Channel Redaction', () => {
    it('sanitizes action text before passing to SlackService to guarantee no raw PII reaches Slack', async () => {
      const event: DecisionAlertEvent = {
        organizationId: 'test-org-1',
        agent: 'CustomerSupportBot',
        action: 'Export customer records containing SSN 987-65-4321 and credit card 4111-2222-3333-4444 to cloud',
        status: 'blocked',
        risk: 'high',
        reason: 'Compliance Violation - Sensitive PII Detected',
        compliance: ['HIPAA', 'GDPR']
      };

      await processAlertJob(event);

      expect(SlackService.notifyDecisionEvent).toHaveBeenCalledTimes(1);
      const passedArgs = (SlackService.notifyDecisionEvent as jest.Mock).mock.calls[0][1];

      expect(passedArgs.action).not.toContain('987-65-4321');
      expect(passedArgs.action).not.toContain('4111-2222-3333-4444');
      expect(passedArgs.action).toContain('[SSN_REDACTED]');
      expect(passedArgs.action).toContain('[CARD_REDACTED]');
    });
  });

  describe('McpController Privacy Enforcement', () => {
    it('redacts PII from incident records, interception logs, and MCP audit logs when action is BLOCKED', async () => {
      const fakeAgent = {
        organizationId: 'test-org-1',
        agentKeyId: 'agent-key-uuid-1',
        name: 'MCPTestBot',
        allowedTools: ['sentra.checkAction'],
        blockedTools: []
      };

      jest.spyOn(McpAgentKeyService, 'authenticateAgentKey').mockResolvedValue(fakeAgent as any);

      jest.spyOn(decisionEngine, 'makeDecision').mockResolvedValue({
        status: 'blocked',
        risk: 'high',
        reason: 'Compliance Violation: High Risk PII Detected',
        compliance: ['GDPR', 'HIPAA'],
        matchedPolicy: 'PII Protection Policy',
        isAllowed: false
      } as any);

      const rawActionText = 'Export customer SSN 987-65-4321 and credit card 4111-2222-3333-4444 to unauthorized bucket';
      const req: any = {
        body: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'sentra.checkAction',
            arguments: {
              action: rawActionText,
              metadata: {
                ssn: '987-65-4321',
                department: 'Analytics'
              }
            }
          },
          id: 101
        },
        headers: {
          authorization: 'Bearer sk-mcp-validkey123456789'
        }
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await McpController.handleJsonRpc(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // 1. Verify prisma.incidents.create was called with REDACTED fields
      expect(prisma.incidents.create).toHaveBeenCalledTimes(1);
      const incidentData = (prisma.incidents.create as jest.Mock).mock.calls[0][0].data;
      expect(incidentData.action).not.toContain('987-65-4321');
      expect(incidentData.action).not.toContain('4111-2222-3333-4444');
      expect(incidentData.action).toContain('[SSN_REDACTED]');
      expect(incidentData.action).toContain('[CARD_REDACTED]');
      expect(incidentData.prompt_excerpt).not.toContain('987-65-4321');
      expect(incidentData.event_metadata.args.metadata.ssn).toBe('[SSN_REDACTED]');

      // 2. Verify prisma.interception_logs.create was called with REDACTED fields
      expect(prisma.interception_logs.create).toHaveBeenCalledTimes(1);
      const interceptionData = (prisma.interception_logs.create as jest.Mock).mock.calls[0][0].data;
      expect(interceptionData.input_text).not.toContain('987-65-4321');
      expect(interceptionData.input_text).not.toContain('4111-2222-3333-4444');
      expect(interceptionData.input_text).toContain('[SSN_REDACTED]');
      expect(interceptionData.metadata.args.metadata.ssn).toBe('[SSN_REDACTED]');

      // 3. Verify prisma.mcp_audit_logs.create was called with REDACTED fields
      expect(prisma.mcp_audit_logs.create).toHaveBeenCalledTimes(1);
      const auditLogData = (prisma.mcp_audit_logs.create as jest.Mock).mock.calls[0][0].data;
      expect(auditLogData.input_summary).not.toContain('987-65-4321');
      expect(auditLogData.input_summary).not.toContain('4111-2222-3333-4444');
      expect(auditLogData.input_summary).toContain('[SSN_REDACTED]');
    });
  });
});
