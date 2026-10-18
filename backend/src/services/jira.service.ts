import prisma from '../config/db';
import logger from '../utils/logger';
import { encryptCredentials, decryptCredentials } from '../utils/credentialHelper';
import { PIIScannerService } from './piiScanner.service';

export interface JiraConfigData {
  siteUrl: string;
  projectKey: string;
  userEmail: string;
  apiToken: string;
  issueType?: string;
  enabled?: boolean;
  hourlyCap?: number;
}

export interface IncidentTicketPayload {
  incidentId: string;
  organizationId: string;
  agent: string;
  action: string;
  risk: string;
  status: string;
  reason?: string;
  matchedPolicy?: string;
  compliance?: string[];
  ruleId?: string;
}

/**
 * Builds valid Atlassian Document Format (ADF v1) for Jira Cloud descriptions.
 */
function buildJiraAdf(data: {
  agent: string;
  action: string;
  status: string;
  risk: string;
  reason: string;
  policy: string;
  frameworks: string;
  incidentUrl: string;
}) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '🚨 Sentraa AI: High-Risk Action Blocked' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A high-risk AI agent action was blocked by active governance policies.', marks: [{ type: "em" }] }
        ]
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Status: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.status.toUpperCase() }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Risk Level: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.risk.toUpperCase() }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Agent: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.agent }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Action: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.action }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Policy Triggered: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.policy }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Frameworks: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.frameworks || 'General Governance' }
              ]
            }]
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Reason: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: data.reason }
              ]
            }]
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '🔗 View incident details in Sentraa Dashboard: ' },
          {
            type: 'text',
            text: data.incidentUrl,
            marks: [{ type: 'link', attrs: { href: data.incidentUrl } }]
          }
        ]
      }
    ]
  };
}

export const JiraService = {
  /**
   * Retrieves Jira configuration for an organization.
   * Decrypts the stored API token internally.
   */
  async getConfig(orgId: string) {
    try {
      const config = await prisma.jira_config.findUnique({
        where: { orgId }
      });
      if (!config) return null;

      let decryptedToken = config.apiToken;
      try {
        decryptedToken = decryptCredentials(config.apiToken);
      } catch {
        decryptedToken = config.apiToken;
      }

      return {
        ...config,
        apiToken: decryptedToken
      };
    } catch (error) {
      logger.error(`[JiraService] Failed to get config for org ${orgId}:`, error);
      return null;
    }
  },

  /**
   * Retrieves sanitized configuration for API transmission (token masked).
   */
  async getMaskedConfig(orgId: string) {
    const config = await this.getConfig(orgId);
    if (!config) return null;

    const token = config.apiToken || '';
    const masked = token.length > 8
      ? `${token.slice(0, 4)}••••••••${token.slice(-4)}`
      : '••••••••••••';

    return {
      siteUrl: config.siteUrl,
      projectKey: config.projectKey,
      userEmail: config.userEmail,
      apiToken: masked,
      issueType: config.issueType,
      enabled: config.enabled,
      hourlyCap: config.hourlyCap,
      updatedAt: config.updatedAt
    };
  },

  /**
   * Saves Jira configuration with AES-256-GCM encrypted API token.
   */
  async saveConfig(orgId: string, data: JiraConfigData) {
    try {
      let tokenToStore = data.apiToken.trim();
      
      // If token is masked string from UI, keep the existing encrypted token
      if (tokenToStore.includes('••••')) {
        const existing = await prisma.jira_config.findUnique({ where: { orgId } });
        if (existing) {
          tokenToStore = existing.apiToken;
        } else {
          throw new Error('Invalid API token');
        }
      } else {
        tokenToStore = encryptCredentials(tokenToStore);
      }

      const cleanSiteUrl = data.siteUrl.trim().replace(/\/$/, '');

      const saved = await prisma.jira_config.upsert({
        where: { orgId },
        update: {
          siteUrl: cleanSiteUrl,
          projectKey: data.projectKey.trim().toUpperCase(),
          userEmail: data.userEmail.trim(),
          apiToken: tokenToStore,
          issueType: data.issueType || 'Task',
          enabled: data.enabled ?? true,
          hourlyCap: Number(data.hourlyCap) || 10
        },
        create: {
          orgId,
          siteUrl: cleanSiteUrl,
          projectKey: data.projectKey.trim().toUpperCase(),
          userEmail: data.userEmail.trim(),
          apiToken: tokenToStore,
          issueType: data.issueType || 'Task',
          enabled: data.enabled ?? true,
          hourlyCap: Number(data.hourlyCap) || 10
        }
      });

      return {
        ...saved,
        apiToken: '••••••••••••'
      };
    } catch (error) {
      logger.error(`[JiraService] Failed to save config for org ${orgId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes Jira configuration
   */
  async deleteConfig(orgId: string) {
    try {
      await prisma.jira_config.delete({ where: { orgId } });
      return true;
    } catch (error) {
      logger.error(`[JiraService] Failed to delete config for org ${orgId}:`, error);
      throw error;
    }
  },

  /**
   * Tests Jira Cloud connectivity and returns plain-language errors.
   */
  async testConnection(data: JiraConfigData): Promise<{ success: boolean; message: string; user?: string }> {
    const siteUrl = data.siteUrl.trim().replace(/\/$/, '');
    const userEmail = data.userEmail.trim();
    const projectKey = data.projectKey.trim().toUpperCase();
    let apiToken = data.apiToken.trim();

    try {
      apiToken = decryptCredentials(apiToken);
    } catch {
      // already decrypted
    }

    const authHeader = `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`;

    // 1. Verify Authentication & User Profile
    let myselfRes: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      myselfRes = await fetch(`${siteUrl}/rest/api/3/myself`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch (netErr: any) {
      if (netErr.name === 'AbortError') {
        throw new Error('Connection timed out while reaching Jira site. Check your site URL.');
      }
      throw new Error(`Unable to reach Jira site at "${siteUrl}". Please verify the site URL.`);
    }

    if (myselfRes.status === 401 || myselfRes.status === 403) {
      throw new Error('Authentication failed: Invalid email or Jira API token. Verify your Atlassian API token.');
    }
    if (!myselfRes.ok) {
      throw new Error(`Jira site returned unexpected status: ${myselfRes.status} ${myselfRes.statusText}`);
    }

    const userData: any = await myselfRes.json();
    const displayName = userData.displayName || userEmail;

    // 2. Verify Project Access and Permission
    const projRes = await fetch(`${siteUrl}/rest/api/3/project/${projectKey}`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    if (projRes.status === 404) {
      throw new Error(`Project key "${projectKey}" was not found on this Jira site.`);
    }
    if (projRes.status === 401 || projRes.status === 403) {
      throw new Error(`Access denied to project "${projectKey}". Ensure your API token has "Browse Projects" and "Create Issues" permissions.`);
    }
    if (!projRes.ok) {
      throw new Error(`Failed to verify project "${projectKey}": Status ${projRes.status}`);
    }

    return {
      success: true,
      message: `Successfully connected to Jira project ${projectKey} as ${displayName}`,
      user: displayName
    };
  },

  /**
   * Creates an incident ticket on BLOCKED + high-risk events with:
   * - Strict Deduplication (one ticket per incident)
   * - Configurable Hourly Cap (default 10) with automatic aggregation into a Summary Ticket
   * - Full PII Redaction
   */
  async createIncidentTicket(payload: IncidentTicketPayload): Promise<{
    success: boolean;
    issueKey?: string;
    issueUrl?: string;
    skipped?: boolean;
    reason?: string;
    deduplicated?: boolean;
    isSummary?: boolean;
  }> {
    const { organizationId, incidentId, agent, action, risk, status, reason, matchedPolicy, compliance } = payload;

    // Requirement: Ticket created on BLOCKED + high risk only
    if (status !== 'blocked' || risk !== 'high') {
      return { success: false, skipped: true, reason: 'Tickets are only created for high-risk blocked actions.' };
    }

    const config = await this.getConfig(organizationId);
    if (!config || !config.enabled) {
      return { success: false, skipped: true, reason: 'Jira integration is not configured or disabled.' };
    }

    // ─── 1. DEDUPLICATION CHECK ───
    let targetIncidentId = incidentId;
    if (!targetIncidentId) {
      const recentIncident = await prisma.incidents.findFirst({
        where: {
          organizationId,
          agent_id: agent,
          created_at: { gte: new Date(Date.now() - 15000) }
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, jira_issue_key: true, jira_issue_url: true }
      });
      if (recentIncident) {
        targetIncidentId = recentIncident.id;
        if (recentIncident.jira_issue_key) {
          logger.info(`[JiraService] Deduplication: Incident ${recentIncident.id} already has Jira ticket ${recentIncident.jira_issue_key}`);
          return {
            success: true,
            issueKey: recentIncident.jira_issue_key,
            issueUrl: recentIncident.jira_issue_url || undefined,
            deduplicated: true
          };
        }
      }
    } else {
      const existing = await prisma.incidents.findUnique({
        where: { id: targetIncidentId },
        select: { id: true, jira_issue_key: true, jira_issue_url: true }
      });

      if (existing?.jira_issue_key) {
        logger.info(`[JiraService] Deduplication: Incident ${targetIncidentId} already has Jira ticket ${existing.jira_issue_key}`);
        return {
          success: true,
          issueKey: existing.jira_issue_key,
          issueUrl: existing.jira_issue_url || undefined,
          deduplicated: true
        };
      }
    }

    // Scrub action text for privacy (defense-in-depth)
    const sanitizedAction = PIIScannerService.redact(action || '');
    const siteUrl = config.siteUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`${config.userEmail}:${config.apiToken}`).toString('base64')}`;
    const dashboardUrl = (process.env.FRONTEND_URL || 'https://sentraatech.info').split(',')[0].replace(/\/$/, '');
    const incidentUrl = `${dashboardUrl}/app/incidents/${incidentId || ''}`;

    // ─── 2. HOURLY TICKET CAP CHECK ───
    const hourlyCap = config.hourlyCap || 10;
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourKey = new Date().toISOString().slice(0, 13); // e.g. "2026-10-18T20"

    const recentTicketCount = await prisma.incidents.count({
      where: {
        organizationId,
        jira_issue_key: { not: null },
        created_at: { gte: oneHourAgo }
      }
    });

    // ─── CASE A: UNDER HOURLY CAP -> CREATE INDIVIDUAL TICKET ───
    if (recentTicketCount < hourlyCap) {
      const issueSummary = `[Sentraa Alert] High-Risk Action Blocked: ${agent.slice(0, 50)}`;
      const adfDoc = buildJiraAdf({
        agent,
        action: sanitizedAction,
        status,
        risk,
        reason: reason || 'Action blocked by Sentraa safety guardrails',
        policy: matchedPolicy || 'Security Guardrail Policy',
        frameworks: Array.isArray(compliance) ? compliance.join(', ') : (compliance || 'AI Safety'),
        incidentUrl
      });

      const createRes = await fetch(`${siteUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          fields: {
            project: { key: config.projectKey },
            summary: issueSummary,
            issuetype: { name: config.issueType || 'Task' },
            description: adfDoc,
            labels: ['sentraa-alert', 'high-risk', 'ai-governance']
          }
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        logger.error(`[JiraService] Jira issue creation failed (${createRes.status}):`, errText);
        throw new Error(`Jira API returned error ${createRes.status}: ${errText.slice(0, 200)}`);
      }

      const issueData: any = await createRes.json();
      const issueKey = issueData.key;
      const issueUrl = `${siteUrl}/browse/${issueKey}`;

      if (incidentId) {
        await prisma.incidents.update({
          where: { id: incidentId },
          data: { jira_issue_key: issueKey, jira_issue_url: issueUrl }
        }).catch(err => logger.error('[JiraService] Failed to record issue key on incident:', err));
      }

      logger.info(`[JiraService] Created Jira issue ${issueKey} for incident ${incidentId}`);
      return { success: true, issueKey, issueUrl, isSummary: false };
    }

    // ─── CASE B: OVER HOURLY CAP -> SUMMARY TICKET AGGREGATION ───
    logger.warn(`[JiraService] Hourly ticket cap reached (${recentTicketCount}/${hourlyCap}) for org ${organizationId}. Aggregating to summary ticket.`);

    // Find or create the summary ticket for the current hour window
    let summaryRecord = await prisma.jira_summary_tickets.findUnique({
      where: {
        orgId_hourKey: {
          orgId: organizationId,
          hourKey
        }
      }
    });

    if (!summaryRecord) {
      // Create new Summary Ticket in Jira
      const summaryTitle = `[Sentraa Overflow Summary] ${hourlyCap}+ Blocked Actions Exceeded (${hourKey}:00)`;
      const summaryAdf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '📊 Sentraa AI: Hourly Blocked Actions Summary' }]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `The rate limit threshold of ${hourlyCap} individual tickets has been reached for this hour (${hourKey}:00). Subsequent high-risk blocked actions are aggregated here to prevent ticket flood:`,
                marks: [{ type: 'strong' }]
              }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: `Incident ${incidentId || 'N/A'}: Agent "${agent}" | Action: "${sanitizedAction}" | Rule: ${matchedPolicy || 'Security Policy'} | ` },
                    { type: 'text', text: 'View Incident', marks: [{ type: 'link', attrs: { href: incidentUrl } }] }
                  ]
                }]
              }
            ]
          }
        ]
      };

      const summaryRes = await fetch(`${siteUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          fields: {
            project: { key: config.projectKey },
            summary: summaryTitle,
            issuetype: { name: config.issueType || 'Task' },
            description: summaryAdf,
            labels: ['sentraa-alert', 'overflow-summary', 'rate-limited']
          }
        })
      });

      if (!summaryRes.ok) {
        const errText = await summaryRes.text();
        throw new Error(`Failed to create Jira summary issue: ${errText.slice(0, 200)}`);
      }

      const summaryData: any = await summaryRes.json();
      const issueKey = summaryData.key;
      const issueUrl = `${siteUrl}/browse/${issueKey}`;

      summaryRecord = await prisma.jira_summary_tickets.create({
        data: {
          orgId: organizationId,
          hourKey,
          issueKey,
          incidentCount: 1
        }
      });

      if (incidentId) {
        await prisma.incidents.update({
          where: { id: incidentId },
          data: { jira_issue_key: issueKey, jira_issue_url: issueUrl }
        }).catch(() => {});
      }

      return { success: true, issueKey, issueUrl, isSummary: true };
    }

    // Append comment to existing summary ticket
    const commentAdf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `• [Blocked Action #${summaryRecord.incidentCount + 1}] `, marks: [{ type: 'strong' }] },
            { type: 'text', text: `Agent: ${agent} | Action: "${sanitizedAction}" | Policy: ${matchedPolicy || 'Security Policy'} | ` },
            { type: 'text', text: 'View Incident', marks: [{ type: 'link', attrs: { href: incidentUrl } }] }
          ]
        }
      ]
    };

    await fetch(`${siteUrl}/rest/api/3/issue/${summaryRecord.issueKey}/comment`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ body: commentAdf })
    }).catch(err => logger.error('[JiraService] Failed to append comment to summary ticket:', err));

    await prisma.jira_summary_tickets.update({
      where: { id: summaryRecord.id },
      data: { incidentCount: { increment: 1 } }
    }).catch(() => {});

    if (incidentId) {
      await prisma.incidents.update({
        where: { id: incidentId },
        data: {
          jira_issue_key: summaryRecord.issueKey,
          jira_issue_url: `${siteUrl}/browse/${summaryRecord.issueKey}`
        }
      }).catch(() => {});
    }

    return {
      success: true,
      issueKey: summaryRecord.issueKey,
      issueUrl: `${siteUrl}/browse/${summaryRecord.issueKey}`,
      isSummary: true
    };
  }
};
