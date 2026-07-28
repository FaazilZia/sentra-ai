import prisma from '../config/db';
import logger from '../utils/logger';

export interface DiscoveredAgentCandidate {
  name: string;
  type: string;
  source: string;
  accessLevel: string;
  permissions: any;
  status: string;
  metadata?: any;
}

export class AgentDiscoveryService {
  /**
   * Scans all connected platforms/integrations for the given organization,
   * purges legacy seed agent records, upserts newly discovered agents using
   * (organizationId + name + source), and returns the complete set of real agent records.
   */
  static async discoverAgents(organizationId: string) {
    logger.info(`[AGENT-DISCOVERY] Starting agent discovery scan for org: ${organizationId}`);

    // 1. Purge legacy fake seed data for this tenant
    try {
      await prisma.agent.deleteMany({
        where: {
          organizationId,
          OR: [
            { name: { in: ['Customer Support Bot', 'Financial Analyst Agent', 'Security Auditing Agent'] } },
            { source: null },
            { source: 'seed' },
            { source: 'mock' },
          ],
        },
      });
    } catch (err) {
      logger.warn(`[AGENT-DISCOVERY] Failed to purge legacy seed data for org ${organizationId}:`, err);
    }

    const candidates: DiscoveredAgentCandidate[] = [];

    // 2. Scan Connectors (S3, GDrive, SQL, local/API)
    try {
      const connectors = await prisma.connectors.findMany({
        where: { organizationId },
      });

      for (const conn of connectors) {
        const platformName = 
          conn.type === 's3' ? 'AWS S3' :
          conn.type === 'gdrive' ? 'Google Drive' :
          conn.type === 'sql' ? 'SQL Database' : 'Custom API';

        candidates.push({
          name: conn.name,
          type: `${conn.type.toUpperCase()}_CONNECTOR`,
          source: `${platformName} Connector`,
          accessLevel: (conn.status === 'active' || conn.status === 'active_partial') ? 'READ_WRITE' : 'RESTRICTED',
          permissions: {
            scope: conn.scope || {},
            granted: [`${conn.type}:read`, `${conn.type}:scan`],
            priority: conn.priority,
          },
          status: conn.status === 'active' ? 'active' : 'inactive',
          metadata: {
            connectorId: conn.id,
            healthScore: conn.health_score,
            lastScanAt: conn.last_scan_at,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan connectors for org ${organizationId}:`, err);
    }

    // 3. Scan MCP Agent Keys
    try {
      const mcpKeys = await prisma.mcp_agent_keys.findMany({
        where: { organizationId, is_active: true },
      });

      for (const key of mcpKeys) {
        candidates.push({
          name: key.name,
          type: 'MCP_AGENT',
          source: 'MCP Protocol',
          accessLevel: (key.allowed_tools && key.allowed_tools.length > 0) ? 'TOOL_BOUND' : 'FULL_ACCESS',
          permissions: {
            allowed_tools: key.allowed_tools,
            blocked_tools: key.blocked_tools,
          },
          status: key.is_active ? 'active' : 'inactive',
          metadata: {
            agentKeyId: key.id,
            key_prefix: key.key_prefix,
            last_used_at: key.last_used_at,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan MCP keys for org ${organizationId}:`, err);
    }

    // 4. Scan LLM API Keys
    try {
      const llmKeys = await prisma.llm_keys.findMany({
        where: { organizationId },
      });

      for (const key of llmKeys) {
        candidates.push({
          name: `${key.provider.toUpperCase()} Agent (${key.maskedKey || 'Primary Key'})`,
          type: 'LLM_API',
          source: `${key.provider.toUpperCase()} API Key`,
          accessLevel: 'API_ACCESS',
          permissions: {
            granted: ['llm:prompt', 'llm:completion', 'llm:inference'],
          },
          status: 'active',
          metadata: {
            keyId: key.id,
            provider: key.provider,
            maskedKey: key.maskedKey,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan LLM keys for org ${organizationId}:`, err);
    }

    // 5. Scan Slack Configuration
    try {
      const slackConfig = await prisma.slack_config.findUnique({
        where: { orgId: organizationId },
      });

      if (slackConfig && slackConfig.enabled) {
        candidates.push({
          name: `Slack Notification Bot (${slackConfig.channel || 'Default Channel'})`,
          type: 'SLACK_BOT',
          source: 'Slack Workspace',
          accessLevel: 'WRITE_NOTIFY',
          permissions: {
            granted: ['slack:webhook', 'slack:notify'],
            notifyOn: slackConfig.notifyOn,
          },
          status: slackConfig.enabled ? 'active' : 'inactive',
          metadata: {
            slackConfigId: slackConfig.id,
            channel: slackConfig.channel,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan Slack config for org ${organizationId}:`, err);
    }

    // 6. Scan Interception Logs (Runtime traffic agents)
    try {
      const distinctLogAgents = await prisma.logs.groupBy({
        by: ['agent'],
        where: {
          organizationId,
          agent: { not: '' },
        },
        _max: {
          timestamp: true,
        },
      });

      for (const logGroup of distinctLogAgents) {
        if (!logGroup.agent) continue;
        candidates.push({
          name: logGroup.agent,
          type: 'RUNTIME_AGENT',
          source: 'Runtime Interception',
          accessLevel: 'MONITORED',
          permissions: {
            granted: ['traffic:intercept', 'policy:evaluate'],
          },
          status: 'active',
          metadata: {
            lastSeen: logGroup._max.timestamp,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan traffic logs for org ${organizationId}:`, err);
    }

    // 7. Scan Registered AI Systems
    try {
      const aiSystems = await prisma.ai_systems.findMany({
        where: { organizationId },
      });

      for (const sys of aiSystems) {
        candidates.push({
          name: sys.name,
          type: sys.use_case || 'AI_SYSTEM',
          source: `${sys.vendor || 'Internal'} Registry`,
          accessLevel: sys.risk_tier === 'CRITICAL' ? 'HIGH_RISK_MONITORED' : 'STANDARD_ACCESS',
          permissions: {
            granted: ['system:registered', 'compliance:tracked'],
            riskTier: sys.risk_tier,
          },
          status: sys.status ? sys.status.toLowerCase() : 'active',
          metadata: {
            aiSystemId: sys.id,
            model_name: sys.model_name,
            model_version: sys.model_version,
            lifecycle_stage: sys.lifecycle_stage,
          },
        });
      }
    } catch (err) {
      logger.error(`[AGENT-DISCOVERY] Failed to scan AI systems for org ${organizationId}:`, err);
    }

    // 8. Upsert all discovered candidates using composite unique key (organizationId, name, source)
    for (const candidate of candidates) {
      try {
        await prisma.agent.upsert({
          where: {
            organizationId_name_source: {
              organizationId,
              name: candidate.name,
              source: candidate.source,
            },
          },
          update: {
            type: candidate.type,
            accessLevel: candidate.accessLevel,
            permissions: candidate.permissions,
            metadata: candidate.metadata,
            status: candidate.status,
          },
          create: {
            organizationId,
            name: candidate.name,
            type: candidate.type,
            source: candidate.source,
            accessLevel: candidate.accessLevel,
            permissions: candidate.permissions,
            metadata: candidate.metadata,
            status: candidate.status,
          },
        });
      } catch (err) {
        logger.error(`[AGENT-DISCOVERY] Failed to upsert agent "${candidate.name}" (${candidate.source}) for org ${organizationId}:`, err);
      }
    }

    // 9. Return all real persisted agent records for the tenant
    const discoveredAgents = await prisma.agent.findMany({
      where: { organizationId },
      orderBy: { discoveredAt: 'desc' },
    });

    logger.info(`[AGENT-DISCOVERY] Discovery completed for org ${organizationId}. Total real agents persisted: ${discoveredAgents.length}`);
    return discoveredAgents;
  }
}
