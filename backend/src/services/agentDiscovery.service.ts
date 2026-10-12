import { randomUUID } from 'node:crypto';
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

  private static resolveIncomingRiskTier(
    action: string,
    decision: { status: string; risk: string; ruleId?: string; reason?: string; isPendingApproval?: boolean }
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const isCriticalViolation =
      decision.status === 'blocked' &&
      (/rule-1|rule-pii-leakage|rule-2|rule-4|rule-gdpr-transfer|rule-hipaa-baa|rule-dpdp-biometric/i.test(decision.ruleId || '') ||
        /ssn|aadhaar|card|cvv|jailbreak|injection|phi\b|biometric|gdpr|hipaa|dpdp|evil-collector/i.test(`${action} ${decision.reason || ''}`));
    if (isCriticalViolation) return 'CRITICAL';

    const isHighRisk =
      decision.status === 'blocked' ||
      decision.status === 'flagged' ||
      decision.risk === 'high' ||
      decision.isPendingApproval === true;
    if (isHighRisk) return 'HIGH';
    if (decision.risk === 'medium') return 'MEDIUM';
    return 'LOW';
  }

  private static resolveAgentDepartment(cleanName: string, metadata: any): string {
    if (metadata?.department) return String(metadata.department);
    if (/gdpr|privacy/i.test(cleanName)) return 'Privacy';
    if (/health|hipaa|clinical/i.test(cleanName)) return 'Healthcare';
    if (/dpdp|compliance|pci|audit/i.test(cleanName)) return 'Compliance';
    if (/billing|finance|payment/i.test(cleanName)) return 'Finance';
    if (/support/i.test(cleanName)) return 'Customer Support';
    if (/export|sync|data/i.test(cleanName)) return 'Data Operations';
    return 'Engineering';
  }

  private static resolveTargetResource(metadata: any): string {
    const candidates = [
      metadata?.resource,
      metadata?.destination,
      metadata?.vendor,
      metadata?.bucket,
      metadata?.file,
      metadata?.clinicId,
      metadata?.registerId,
      metadata?.noticeId,
      metadata?.invoiceId,
      metadata?.payoutId,
    ];
    const found = candidates.find((val) => typeof val === 'string' && val.trim().length > 0);
    return found || 'Sentra API Gateway';
  }

  private static resolveAccessLevel(tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    if (tier === 'CRITICAL') return 'HIGH_RISK_MONITORED';
    if (tier === 'HIGH') return 'READ_WRITE';
    return 'MONITORED';
  }

  private static async upsertAiSystemRecord(params: {
    organizationId: string;
    cleanName: string;
    department: string;
    targetResource: string;
    modelName: string;
    useCase: string;
    incomingTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<{ aiSystemId?: string; resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }> {
    const tierRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    let resolvedTier = params.incomingTier;
    if (!prisma.ai_systems?.findFirst) {
      return { resolvedTier };
    }

    const existingSys = await prisma.ai_systems.findFirst({
      where: { organizationId: params.organizationId, OR: [{ name: params.cleanName }, { id: params.cleanName }] },
    });

    if (existingSys) {
      const existingTier = (existingSys.risk_tier || 'LOW').toUpperCase();
      if ((tierRank[existingTier] || 1) > tierRank[params.incomingTier]) {
        resolvedTier = existingTier as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      }
      if (resolvedTier !== existingSys.risk_tier) {
        await prisma.ai_systems.updateMany({
          where: { id: existingSys.id, organizationId: params.organizationId },
          data: { risk_tier: resolvedTier, updated_at: new Date() },
        });
      }
      return { aiSystemId: existingSys.id, resolvedTier };
    }

    const createdSys = await prisma.ai_systems.create({
      data: {
        id: randomUUID(),
        organizationId: params.organizationId,
        name: params.cleanName,
        description: `Runtime SDK agent operating in ${params.department} (${params.targetResource})`,
        model_name: params.modelName,
        model_version: '2026.1',
        vendor: 'Runtime Interception',
        use_case: params.useCase,
        risk_tier: resolvedTier,
        status: 'ACTIVE',
        lifecycle_stage: 'PRODUCTION',
      },
    });
    return { aiSystemId: createdSys?.id, resolvedTier };
  }

  private static async upsertRiskAssessmentRecord(
    organizationId: string,
    aiSystemId: string | undefined,
    resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<void> {
    if (!aiSystemId || !prisma.risk_assessments?.findFirst) return;
    const tierScore: Record<string, number> = { LOW: 20, MEDIUM: 48, HIGH: 76, CRITICAL: 92 };
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
      return;
    }

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

  private static async upsertAttackGraphAgentRecord(params: {
    organizationId: string;
    cleanName: string;
    aiSystemId?: string;
    department: string;
    resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    targetResource: string;
    action: string;
    status: string;
  }): Promise<void> {
    if (!prisma.agent?.upsert) return;
    const existingAgent = prisma.agent.findFirst
      ? await prisma.agent.findFirst({
          where: { organizationId: params.organizationId, name: params.cleanName, source: 'Runtime Interception' },
        })
      : null;
    const prevMeta = (existingAgent?.metadata as Record<string, any>) || {};
    const prevResources: string[] = Array.isArray(prevMeta.resources) ? prevMeta.resources : [];
    const mergedResources = Array.from(new Set([...prevResources, String(params.targetResource)])).slice(0, 20);
    const accessLevel = AgentDiscoveryService.resolveAccessLevel(params.resolvedTier);

    const permissionsPayload = {
      granted: ['traffic:intercept', 'policy:evaluate'],
      riskTier: params.resolvedTier,
      department: params.department,
    };
    const metadataPayload = {
      ...prevMeta,
      aiSystemId: params.aiSystemId,
      department: params.department,
      riskTier: params.resolvedTier,
      resources: mergedResources,
      lastAction: params.action,
      lastStatus: params.status,
      lastSeen: new Date().toISOString(),
    };

    await prisma.agent.upsert({
      where: {
        organizationId_name_source: {
          organizationId: params.organizationId,
          name: params.cleanName,
          source: 'Runtime Interception',
        },
      },
      update: {
        type: 'RUNTIME_AGENT',
        accessLevel,
        permissions: permissionsPayload,
        metadata: metadataPayload,
        status: 'active',
      },
      create: {
        organizationId: params.organizationId,
        name: params.cleanName,
        type: 'RUNTIME_AGENT',
        source: 'Runtime Interception',
        accessLevel,
        permissions: permissionsPayload,
        metadata: metadataPayload,
        status: 'active',
      },
    });
  }

  private static async upsertAiAgentBaselineRecord(params: {
    organizationId: string;
    cleanName: string;
    modelName: string;
    action: string;
    department: string;
    resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<void> {
    if (!prisma.ai_agents?.findFirst) return;
    const existingAiAgent = await prisma.ai_agents.findFirst({
      where: { organizationId: params.organizationId, name: params.cleanName },
    });
    if (existingAiAgent) {
      const prevBaseline = Array.isArray(existingAiAgent.baselineActions) ? existingAiAgent.baselineActions : [];
      if (!prevBaseline.includes(params.action)) {
        await prisma.ai_agents.update({
          where: { id: existingAiAgent.id },
          data: {
            baselineActions: [...prevBaseline, params.action],
            baselineSampledAt: new Date(),
            updated_at: new Date(),
          },
        });
      }
      return;
    }

    await prisma.ai_agents.create({
      data: {
        organizationId: params.organizationId,
        name: params.cleanName,
        model: params.modelName,
        permissions: [params.action],
        status: 'Active',
        metadata: { department: params.department, riskTier: params.resolvedTier, source: 'Runtime Interception' },
        baselineActions: [params.action],
        baselineDataScopes: [params.department.toLowerCase()],
        baselineSampledAt: new Date(),
      },
    });
  }

  /**
   * Upserts agent inventory across ai_systems, risk_assessments, Agent (attack graph),
   * and ai_agents whenever real SDK traffic is evaluated.
   */
  static async upsertRuntimeAgentInventory(
    orgOrParams:
      | string
      | {
          organizationId: string;
          agentName: string;
          action: string;
          status?: string;
          risk?: string;
          ruleId?: string;
          reason?: string;
          isPendingApproval?: boolean;
          decision?: { status: string; risk: string; ruleId?: string; reason?: string; isPendingApproval?: boolean };
          metadata?: any;
        },
    agentNameArg?: string,
    actionArg?: string,
    decisionArg?: { status: string; risk: string; ruleId?: string; reason?: string; isPendingApproval?: boolean },
    metadataArg: any = {}
  ): Promise<void> {
    const isObj = typeof orgOrParams === 'object' && orgOrParams !== null;
    const organizationId = isObj ? orgOrParams.organizationId : orgOrParams;
    const agentName = isObj ? orgOrParams.agentName : (agentNameArg || '');
    const action = isObj ? orgOrParams.action : (actionArg || '');
    const decision = isObj
      ? orgOrParams.decision || {
          status: orgOrParams.status || 'allowed',
          risk: orgOrParams.risk || 'low',
          ruleId: orgOrParams.ruleId,
          reason: orgOrParams.reason,
          isPendingApproval: orgOrParams.isPendingApproval,
        }
      : decisionArg || { status: 'allowed', risk: 'low' };
    const metadata = isObj ? orgOrParams.metadata || {} : metadataArg || {};

    if (!organizationId || !agentName || typeof agentName !== 'string' || !agentName.trim()) {
      return;
    }

    const cleanName = agentName.trim();
    const incomingTier = AgentDiscoveryService.resolveIncomingRiskTier(action, decision);
    const department = AgentDiscoveryService.resolveAgentDepartment(cleanName, metadata);
    const targetResource = AgentDiscoveryService.resolveTargetResource(metadata);
    const modelName = metadata?.model || 'gpt-4o';
    const useCase = metadata?.useCase || `${department} Autonomous Agent`;

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

    let aiSystemId: string | undefined;
    let resolvedTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = incomingTier;
    try {
      const sysResult = await AgentDiscoveryService.upsertAiSystemRecord({
        organizationId,
        cleanName,
        department,
        targetResource,
        modelName,
        useCase,
        incomingTier,
      });
      aiSystemId = sysResult.aiSystemId;
      resolvedTier = sysResult.resolvedTier;
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert ai_systems for ${cleanName}:`, err);
    }

    try {
      await AgentDiscoveryService.upsertRiskAssessmentRecord(organizationId, aiSystemId, resolvedTier);
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert risk_assessments for ${cleanName}:`, err);
    }

    try {
      await AgentDiscoveryService.upsertAttackGraphAgentRecord({
        organizationId,
        cleanName,
        aiSystemId,
        department,
        resolvedTier,
        targetResource,
        action,
        status: decision.status,
      });
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to upsert Agent for ${cleanName}:`, err);
    }

    try {
      await AgentDiscoveryService.upsertAiAgentBaselineRecord({
        organizationId,
        cleanName,
        modelName,
        action,
        department,
        resolvedTier,
      });
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

      const logsByAgent = new Map<string, any>();
      for (const l of recentLogs) {
        if (l.agent && !existingNames.has(l.agent)) {
          logsByAgent.set(l.agent, l);
        }
      }
      if (logsByAgent.size === 0) return;

      await Promise.all(
        Array.from(logsByAgent.values()).map((l: any) => {
          const meta = (l.metadata as Record<string, any>) || {};
          return AgentDiscoveryService.upsertRuntimeAgentInventory(
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
        })
      );
    } catch (err) {
      logger.warn(`[AGENT-INVENTORY] Failed to sync logs to inventory for org ${organizationId}:`, err);
    }
  }
}
