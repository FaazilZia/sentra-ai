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
        const existingRuntimeIdx = candidates.findIndex(
          c => c.name === sys.name && c.source === 'Runtime Interception'
        );
        const sysAccessLevel = sys.risk_tier === 'CRITICAL' ? 'HIGH_RISK_MONITORED' : 'STANDARD_ACCESS';
        if (existingRuntimeIdx >= 0 && sys.vendor === 'Runtime Interception') {
          candidates[existingRuntimeIdx].accessLevel = sysAccessLevel;
          candidates[existingRuntimeIdx].permissions = {
            ...candidates[existingRuntimeIdx].permissions,
            riskTier: sys.risk_tier,
          };
          candidates[existingRuntimeIdx].metadata = {
            ...candidates[existingRuntimeIdx].metadata,
            aiSystemId: sys.id,
            model_name: sys.model_name,
            model_version: sys.model_version,
            lifecycle_stage: sys.lifecycle_stage,
          };
          continue;
        }

        candidates.push({
          name: sys.name,
          type: sys.use_case || 'AI_SYSTEM',
          source: `${sys.vendor || 'Internal'} Registry`,
          accessLevel: sysAccessLevel,
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

  /**
   * Upserts agent inventory across ai_systems, risk_assessments, Agent (attack graph),
   * and ai_agents whenever real SDK traffic is evaluated.
   */
  static async upsertRuntimeAgentInventory(
    organizationId: string,
    agentName: string,
    action: string,
    decision: { status: string; risk: string; ruleId?: string; reason?: string; isPendingApproval?: boolean },
    metadata: any = {}
  ): Promise<void> {
    if (!organizationId || !agentName || typeof agentName !== 'string' || !agentName.trim()) {
      return;
    }

    const cleanName = agentName.trim();
    const { randomUUID } = require('crypto');

    const tierRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const tierScore: Record<string, number> = { LOW: 20, MEDIUM: 48, HIGH: 76, CRITICAL: 92 };

    const isCriticalViolation =
      decision.status === 'blocked' &&
      (/rule-1|rule-pii-leakage|rule-2|rule-4|rule-gdpr-transfer|rule-hipaa-baa|rule-dpdp-biometric/i.test(decision.ruleId || '') ||
        /ssn|aadhaar|card|cvv|jailbreak|injection|phi\b|biometric|gdpr|hipaa|dpdp|evil-collector/i.test(`${action} ${decision.reason || ''}`));
    const isHighRisk = decision.status === 'blocked' || decision.status === 'flagged' || decision.risk === 'high' || decision.isPendingApproval === true;
    const incomingTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = isCriticalViolation
      ? 'CRITICAL'
      : isHighRisk
      ? 'HIGH'
      : decision.risk === 'medium'
      ? 'MEDIUM'
      : 'LOW';

    const department =
      metadata?.department ||
      (/gdpr|privacy/i.test(cleanName)
        ? 'Privacy'
        : /health|hipaa|clinical/i.test(cleanName)
        ? 'Healthcare'
        : /dpdp|compliance|pci|audit/i.test(cleanName)
        ? 'Compliance'
        : /billing|finance|payment/i.test(cleanName)
        ? 'Finance'
        : /support/i.test(cleanName)
        ? 'Customer Support'
        : /export|sync|data/i.test(cleanName)
        ? 'Data Operations'
        : 'Engineering');

    const targetResource =
      metadata?.resource ||
      metadata?.destination ||
      metadata?.vendor ||
      metadata?.bucket ||
      metadata?.file ||
      metadata?.clinicId ||
      metadata?.registerId ||
      metadata?.noticeId ||
      metadata?.invoiceId ||
      metadata?.payoutId ||
      'Sentra API Gateway';

    const modelName = metadata?.model || 'gpt-4o';
    const useCase = metadata?.useCase || `${department} Autonomous Agent`;

    // 1. Ensure organizations.sdkConnectedAt is stamped
    try {
      if (prisma.organizations?.updateMany) {
        await prisma.organizations.updateMany({
          where: { id: organizationId, sdkConnectedAt: null },
          data: { sdkConnectedAt: new Date() },
        });
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to update sdkConnectedAt for org ${organizationId}:`, err);
    }

    // 2. Upsert into ai_systems
    let aiSystemId: string | undefined;
    let resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = incomingTier;
    try {
      if (prisma.ai_systems?.findFirst) {
        const existingSys = await prisma.ai_systems.findFirst({
          where: { organizationId, OR: [{ name: cleanName }, { id: cleanName }] },
        });

        if (existingSys) {
          aiSystemId = existingSys.id;
          const existingTier = (existingSys.risk_tier || 'LOW').toUpperCase();
          if ((tierRank[existingTier] || 1) > tierRank[incomingTier]) {
            resolvedTier = existingTier as any;
          }
          if (resolvedTier !== existingSys.risk_tier) {
            await prisma.ai_systems.updateMany({
              where: { id: existingSys.id, organizationId },
              data: { risk_tier: resolvedTier, updated_at: new Date() },
            });
          }
        } else {
          const createdSys = await prisma.ai_systems.create({
            data: {
              id: randomUUID(),
              organizationId,
              name: cleanName,
              description: `Runtime SDK agent operating in ${department} (${targetResource})`,
              model_name: modelName,
              model_version: '2026.1',
              vendor: 'Runtime Interception',
              use_case: useCase,
              risk_tier: resolvedTier,
              status: 'ACTIVE',
              lifecycle_stage: 'PRODUCTION',
            },
          });
          aiSystemId = createdSys?.id;
        }
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert ai_systems for ${cleanName}:`, err);
    }

    // 3. Upsert into risk_assessments
    try {
      if (aiSystemId && prisma.risk_assessments?.findFirst) {
        const existingAssessment = await prisma.risk_assessments.findFirst({
          where: { organizationId, ai_system_id: aiSystemId },
        });
        const resolvedScore = Math.max(existingAssessment?.score ?? 0, tierScore[resolvedTier] ?? 20);
        if (existingAssessment) {
          if (existingAssessment.score !== resolvedScore || existingAssessment.risk_level !== resolvedTier) {
            await prisma.risk_assessments.update({
              where: { id: existingAssessment.id },
              data: {
                score: resolvedScore,
                risk_level: resolvedTier,
                status: 'SUBMITTED',
                updated_at: new Date(),
              },
            });
          }
        } else {
          await prisma.risk_assessments.create({
            data: {
              id: randomUUID(),
              organizationId,
              ai_system_id: aiSystemId,
              score: resolvedScore,
              risk_level: resolvedTier,
              status: 'SUBMITTED',
            },
          });
        }
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert risk_assessments for ${cleanName}:`, err);
    }

    // 4. Upsert into Agent (used by AttackGraphService and AgentDiscoveryService)
    try {
      if (prisma.agent?.upsert) {
        const existingAgent = prisma.agent.findFirst
          ? await prisma.agent.findFirst({
              where: { organizationId, name: cleanName, source: 'Runtime Interception' },
            })
          : null;
        const prevMeta = (existingAgent?.metadata as Record<string, any>) || {};
        const prevResources: string[] = Array.isArray(prevMeta.resources) ? prevMeta.resources : [];
        const mergedResources = Array.from(new Set([...prevResources, String(targetResource)])).slice(0, 20);
        const accessLevel =
          resolvedTier === 'CRITICAL'
            ? 'HIGH_RISK_MONITORED'
            : resolvedTier === 'HIGH'
            ? 'READ_WRITE'
            : 'MONITORED';

        await prisma.agent.upsert({
          where: {
            organizationId_name_source: {
              organizationId,
              name: cleanName,
              source: 'Runtime Interception',
            },
          },
          update: {
            type: 'RUNTIME_AGENT',
            accessLevel,
            permissions: {
              granted: ['traffic:intercept', 'policy:evaluate'],
              riskTier: resolvedTier,
              department,
            },
            metadata: {
              ...prevMeta,
              aiSystemId,
              department,
              riskTier: resolvedTier,
              resources: mergedResources,
              lastAction: action,
              lastStatus: decision.status,
              lastSeen: new Date().toISOString(),
            },
            status: 'active',
          },
          create: {
            organizationId,
            name: cleanName,
            type: 'RUNTIME_AGENT',
            source: 'Runtime Interception',
            accessLevel,
            permissions: {
              granted: ['traffic:intercept', 'policy:evaluate'],
              riskTier: resolvedTier,
              department,
            },
            metadata: {
              aiSystemId,
              department,
              riskTier: resolvedTier,
              resources: mergedResources,
              lastAction: action,
              lastStatus: decision.status,
              lastSeen: new Date().toISOString(),
            },
            status: 'active',
          },
        });
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert Agent for ${cleanName}:`, err);
    }

    // 5. Upsert into ai_agents (used by /inventory/agents and DriftBaselineService)
    try {
      if (prisma.ai_agents?.findFirst) {
        const existingAiAgent = await prisma.ai_agents.findFirst({
          where: { organizationId, name: cleanName },
        });
        if (existingAiAgent) {
          const prevBaseline = Array.isArray(existingAiAgent.baselineActions) ? existingAiAgent.baselineActions : [];
          if (!prevBaseline.includes(action)) {
            await prisma.ai_agents.update({
              where: { id: existingAiAgent.id },
              data: {
                baselineActions: [...prevBaseline, action],
                baselineSampledAt: new Date(),
                updated_at: new Date(),
              },
            });
          }
        } else {
          await prisma.ai_agents.create({
            data: {
              organizationId,
              name: cleanName,
              model: modelName,
              permissions: [action],
              status: 'Active',
              metadata: { department, riskTier: resolvedTier, source: 'Runtime Interception' },
              baselineActions: [action],
              baselineDataScopes: [department.toLowerCase()],
              baselineSampledAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert ai_agents for ${cleanName}:`, err);
    }
  }

  /**
   * Backfills ai_systems, risk_assessments, Agent, and ai_agents from real prisma.logs
   * if logs exist for agents not yet present in ai_systems.
   */
  static async syncLogsToInventory(organizationId: string): Promise<void> {
    if (!organizationId || !prisma.logs?.findMany) return;
    try {
      const recentLogs = await prisma.logs.findMany({
        where: { organizationId },
        orderBy: { timestamp: 'asc' },
        take: 200,
      });
      if (!Array.isArray(recentLogs) || recentLogs.length === 0) return;

      const existingSystems = prisma.ai_systems?.findMany
        ? await prisma.ai_systems.findMany({ where: { organizationId }, select: { name: true } })
        : [];
      const existingNames = new Set((existingSystems || []).map((s: any) => s.name));

      const logsToSync = recentLogs.filter((l: any) => l.agent && !existingNames.has(l.agent));
      if (logsToSync.length === 0) return;

      for (const l of recentLogs) {
        if (!l.agent) continue;
        const meta = (l.metadata as Record<string, any>) || {};
        await AgentDiscoveryService.upsertRuntimeAgentInventory(
          organizationId,
          l.agent,
          l.action,
          {
            status: l.status,
            risk: l.risk,
            ruleId: meta.ruleId || meta.matchedPolicy,
            reason: l.reason || undefined,
            isPendingApproval: l.isPendingApproval,
          },
          meta
        );
      }
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to sync logs to inventory for org ${organizationId}:`, err);
    }
  }
}
