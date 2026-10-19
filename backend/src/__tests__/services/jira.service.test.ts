jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    jira_config: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    jira_summary_tickets: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    incidents: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    organizations: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../config/db';
import { JiraService } from '../../services/jira.service';
import { encryptCredentials } from '../../utils/credentialHelper';

// Mock global fetch for Jira REST API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Jira Service & Outbound Adapter', () => {
  const orgId = 'org-jira-test-123';
  const siteUrl = 'https://sentraa-test.atlassian.net';
  const projectKey = 'SEC';
  const userEmail = 'secops@sentraa.ai';
  const rawApiToken = 'ATATT3xFfGF0TestSecretToken12345';
  const encryptedApiToken = encryptCredentials(rawApiToken);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration & Credential Encryption', () => {
    it('encrypts API token on saveConfig and decrypts on getConfig', async () => {
      (prisma.jira_config.upsert as jest.Mock).mockResolvedValue({
        id: 'jc-1',
        orgId,
        siteUrl,
        projectKey,
        userEmail,
        apiToken: encryptedApiToken,
        issueType: 'Task',
        enabled: true,
        hourlyCap: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const saved = await JiraService.saveConfig(orgId, {
        siteUrl,
        projectKey,
        userEmail,
        apiToken: rawApiToken,
        hourlyCap: 10
      });

      expect(prisma.jira_config.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { orgId },
        update: expect.objectContaining({
          siteUrl,
          projectKey: 'SEC',
          userEmail
        })
      }));
      // Verify stored token is encrypted ciphertext, not plaintext
      const storedToken = (prisma.jira_config.upsert as jest.Mock).mock.calls[0][0].update.apiToken;
      expect(storedToken).not.toBe(rawApiToken);
      expect(storedToken.split(':').length).toBe(3); // iv:authTag:ciphertext

      // getMaskedConfig returns masked token
      (prisma.jira_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'jc-1',
        orgId,
        siteUrl,
        projectKey,
        userEmail,
        apiToken: encryptedApiToken,
        issueType: 'Task',
        enabled: true,
        hourlyCap: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const maskedConfig = await JiraService.getMaskedConfig(orgId);
      expect(maskedConfig?.apiToken).toContain('••••');
      expect(maskedConfig?.apiToken).not.toBe(rawApiToken);
    });
  });

  describe('testConnection & Plain-Language Error Reporting', () => {
    it('returns success when credentials and project are valid', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ displayName: 'SecOps Sentinel' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ key: 'SEC', name: 'Security Governance' })
        });

      const result = await JiraService.testConnection({
        siteUrl,
        projectKey,
        userEmail,
        apiToken: rawApiToken
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected to Jira project SEC as SecOps Sentinel');
    });

    it('returns readable error when credentials are bad (401/403)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(JiraService.testConnection({
        siteUrl,
        projectKey,
        userEmail,
        apiToken: 'wrong-token'
      })).rejects.toThrow('Authentication failed: Invalid email or Jira API token.');
    });

    it('returns readable error when project key does not exist (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ displayName: 'SecOps Sentinel' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

      await expect(JiraService.testConnection({
        siteUrl,
        projectKey: 'NONEXISTENT',
        userEmail,
        apiToken: rawApiToken
      })).rejects.toThrow('Project key "NONEXISTENT" was not found on this Jira site.');
    });
  });

  describe('Deduplication & Trigger Rules', () => {
    it('skips ticket creation for FLAGGED or low-risk actions', async () => {
      const resFlagged = await JiraService.createIncidentTicket({
        incidentId: 'inc-flag-1',
        organizationId: orgId,
        agent: 'agent-1',
        action: 'Update config',
        risk: 'medium',
        status: 'flagged'
      });
      expect(resFlagged.skipped).toBe(true);

      const resLowRisk = await JiraService.createIncidentTicket({
        incidentId: 'inc-low-1',
        organizationId: orgId,
        agent: 'agent-1',
        action: 'Read audit log',
        risk: 'low',
        status: 'blocked'
      });
      expect(resLowRisk.skipped).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('guarantees idempotency and deduplication: returns existing issue key without creating duplicate', async () => {
      (prisma.jira_config.findUnique as jest.Mock).mockResolvedValue({
        orgId,
        siteUrl,
        projectKey,
        userEmail,
        apiToken: encryptedApiToken,
        enabled: true,
        hourlyCap: 10
      });

      (prisma.incidents.findUnique as jest.Mock).mockResolvedValue({
        id: 'inc-already-ticketed',
        jira_issue_key: 'SEC-42',
        jira_issue_url: 'https://sentraa-test.atlassian.net/browse/SEC-42'
      });

      const res = await JiraService.createIncidentTicket({
        incidentId: 'inc-already-ticketed',
        organizationId: orgId,
        agent: 'payment-bot',
        action: 'Export payroll data',
        risk: 'high',
        status: 'blocked'
      });

      expect(res.success).toBe(true);
      expect(res.deduplicated).toBe(true);
      expect(res.issueKey).toBe('SEC-42');
      // No REST calls made to Jira
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting & Hourly Ticket Cap Aggregation', () => {
    beforeEach(() => {
      (prisma.jira_config.findUnique as jest.Mock).mockResolvedValue({
        orgId,
        siteUrl,
        projectKey,
        userEmail,
        apiToken: encryptedApiToken,
        enabled: true,
        hourlyCap: 3 // Set low cap of 3 for testing
      });
      (prisma.incidents.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('creates an individual ticket when under the hourly cap', async () => {
      (prisma.incidents.count as jest.Mock).mockResolvedValue(2); // 2 < 3

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ key: 'SEC-101', id: '10001' })
      });

      (prisma.incidents.update as jest.Mock).mockResolvedValue({});

      const res = await JiraService.createIncidentTicket({
        incidentId: 'inc-under-cap',
        organizationId: orgId,
        agent: 'data-exfiltration-agent',
        action: 'Dump database credentials with SSN 000-12-3456 and CC 4532-1234-5678-9010',
        risk: 'high',
        status: 'blocked',
        reason: 'Policy Violation - Sensitive PII Detected'
      });

      expect(res.success).toBe(true);
      expect(res.isSummary).toBe(false);
      expect(res.issueKey).toBe('SEC-101');

      // Verify Jira API was called with sanitized / redacted action
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const descriptionStr = JSON.stringify(requestBody.fields.description);
      expect(descriptionStr).not.toContain('000-12-3456');
      expect(descriptionStr).not.toContain('4532-1234-5678-9010');
      expect(descriptionStr).toContain('[SSN_REDACTED]');
      expect(descriptionStr).toContain('[CARD_REDACTED]');

      expect(prisma.incidents.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'inc-under-cap' },
        data: expect.objectContaining({
          jira_issue_key: 'SEC-101',
        })
      }));
    });

    it('creates an hourly summary ticket when reaching the cap (first overflow incident)', async () => {
      (prisma.incidents.count as jest.Mock).mockResolvedValue(3); // 3 >= 3 (cap reached)
      (prisma.jira_summary_tickets.findUnique as jest.Mock).mockResolvedValue(null); // No summary ticket yet

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ key: 'SEC-999-SUMMARY', id: '19999' })
      });

      (prisma.jira_summary_tickets.create as jest.Mock).mockResolvedValue({
        id: 'jst-1',
        issueKey: 'SEC-999-SUMMARY',
        incidentCount: 1
      });

      const res = await JiraService.createIncidentTicket({
        incidentId: 'inc-overflow-1',
        organizationId: orgId,
        agent: 'payroll-bot',
        action: 'Export payroll with SSN 123-45-6789',
        risk: 'high',
        status: 'blocked'
      });

      expect(res.success).toBe(true);
      expect(res.isSummary).toBe(true);
      expect(res.issueKey).toBe('SEC-999-SUMMARY');

      // Created a summary issue in Jira
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.fields.summary).toContain('[Sentraa Overflow Summary]');

      // Stored in jira_summary_tickets
      expect(prisma.jira_summary_tickets.create).toHaveBeenCalled();
    });

    it('appends a comment to the existing summary ticket for subsequent overflow incidents', async () => {
      (prisma.incidents.count as jest.Mock).mockResolvedValue(5); // 5 >= 3
      (prisma.jira_summary_tickets.findUnique as jest.Mock).mockResolvedValue({
        id: 'jst-1',
        issueKey: 'SEC-999-SUMMARY',
        incidentCount: 2
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'comment-1' })
      });

      (prisma.jira_summary_tickets.update as jest.Mock).mockResolvedValue({});

      const res = await JiraService.createIncidentTicket({
        incidentId: 'inc-overflow-3',
        organizationId: orgId,
        agent: 'rogue-agent',
        action: 'Bulk export users',
        risk: 'high',
        status: 'blocked'
      });

      expect(res.success).toBe(true);
      expect(res.isSummary).toBe(true);
      expect(res.issueKey).toBe('SEC-999-SUMMARY');

      // Called comment endpoint, NOT create issue endpoint
      expect(mockFetch.mock.calls[0][0]).toContain('/rest/api/3/issue/SEC-999-SUMMARY/comment');
      // Incremented summary counter
      expect(prisma.jira_summary_tickets.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'jst-1' },
        data: { incidentCount: { increment: 1 } }
      }));
    });
  });
});
