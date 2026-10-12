import prisma from '../config/db';
import logger from '../utils/logger';

export interface AttackGraphNode {
  id: string;
  label: string;
  type: 'AGENT' | 'CONNECTOR' | 'DATA_SOURCE' | 'LLM_KEY';
  agentType?: string;
  accessLevel?: string;
  status: string;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusScore: number;
  transitiveReachCount?: number;
  details?: any;
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'ACCESSES_CONNECTOR' | 'SHARES_CREDENTIAL' | 'CONNECTED_TO_DATA' | 'TOOL_BOUND';
  label: string;
  riskLevel?: string;
  isPrivilegeEscalationPath?: boolean;
  escalationReason?: string;
}

export interface PrivilegePath {
  agentId: string;
  agentName: string;
  maxImpactAction: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusScore: number;
  connectedResourcesCount: number;
  transitiveReachCount: number;
  isPrivilegeEscalation: boolean;
  escalationReason?: string;
  path: string[];
}

export interface AttackGraphPayload {
  nodes: AttackGraphNode[];
  edges: AttackGraphEdge[];
  privilegePaths: PrivilegePath[];
  summary: {
    totalAgents: number;
    totalConnectors: number;
    criticalPathsCount: number;
    avgBlastRadius: number;
  };
}

export class AttackGraphService {
  /**
   * Dynamically constructs an Agent Relationship & Attack Graph for an organization
   * based on discovered agents, connectors, MCP keys, and LLM keys.
   * Includes Multi-hop Blast Radius (Transitive Reach) and Privilege Escalation Path Highlighting.
   */
  static async buildGraph(organizationId: string): Promise<AttackGraphPayload> {
    logger.info(`[ATTACK-GRAPH] Building multi-hop relationship graph for organization: ${organizationId}`);

    if (typeof organizationId === 'string' && organizationId.trim()) {
      try {
        const { AgentDiscoveryService } = require('./agentDiscovery.service');
        await AgentDiscoveryService.syncLogsToInventory(organizationId);
      } catch {
        // Ignore sync errors in unit tests
      }
    }

    // 1. Fetch persisted agents and active connectors/keys
    const [agents, connectors, mcpKeys, llmKeys] = await Promise.all([
      prisma.agent.findMany({ where: { organizationId } }),
      prisma.connectors.findMany({ where: { organizationId } }),
      prisma.mcp_agent_keys.findMany({ where: { organizationId, is_active: true } }),
      prisma.llm_keys.findMany({ where: { organizationId } }),
    ]);

    const nodes: AttackGraphNode[] = [];
    const edges: AttackGraphEdge[] = [];
    const privilegePaths: PrivilegePath[] = [];

    // Map tracking direct connections
    const resourceAgentMap = new Map<string, string[]>(); // resourceId -> agentIds
    const agentConnectorsMap = new Map<string, string[]>(); // agentId -> resourceIds
    const connectorMap = new Map<string, any>(); // resourceId -> connector object

    // A. Add Connector & Data Source Nodes
    for (const conn of connectors) {
      const connNodeId = `conn-${conn.id}`;
      connectorMap.set(connNodeId, conn);
      const risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
        conn.type === 'sql' || conn.type === 's3' ? 'CRITICAL' :
        conn.type === 'gdrive' ? 'HIGH' : 'MEDIUM';

      nodes.push({
        id: connNodeId,
        label: conn.name,
        type: 'CONNECTOR',
        accessLevel: (conn.status === 'active' || conn.status === 'active_partial') ? 'READ_WRITE' : 'RESTRICTED',
        status: conn.status,
        risk,
        blastRadiusScore: risk === 'CRITICAL' ? 75 : 50,
        details: {
          connectorType: conn.type,
          healthScore: conn.health_score,
          priority: conn.priority,
          scope: conn.scope,
        },
      });
    }

    // B. Add LLM Key Nodes
    for (const key of llmKeys) {
      const keyNodeId = `llm-${key.id}`;
      nodes.push({
        id: keyNodeId,
        label: `${key.provider.toUpperCase()} API Key`,
        type: 'LLM_KEY',
        accessLevel: 'API_INFERENCE',
        status: 'active',
        risk: 'HIGH',
        blastRadiusScore: 60,
        details: {
          provider: key.provider,
          maskedKey: key.maskedKey,
        },
      });
    }

    // C. Process Agent Nodes & Direct Edges
    for (const agent of agents) {
      const agentNodeId = `agent-${agent.id}`;
      const connectedResourceIds: string[] = [];

      // Link agent to matching connectors by name/type/metadata
      for (const conn of connectors) {
        const connNodeId = `conn-${conn.id}`;
        const isMatch =
          agent.name.toLowerCase().includes(conn.name.toLowerCase()) ||
          agent.type.toLowerCase().includes(conn.type.toLowerCase()) ||
          (agent.metadata && (agent.metadata as any).connectorId === conn.id);

        if (isMatch) {
          connectedResourceIds.push(connNodeId);
          edges.push({
            id: `edge-${agent.id}-${conn.id}`,
            source: agentNodeId,
            target: connNodeId,
            type: 'ACCESSES_CONNECTOR',
            label: agent.accessLevel || 'READ_WRITE',
            riskLevel: conn.type === 'sql' || conn.type === 's3' ? 'CRITICAL' : 'HIGH',
          });

          const list = resourceAgentMap.get(connNodeId) || [];
          list.push(agentNodeId);
          resourceAgentMap.set(connNodeId, list);
        }
      }

      // Link agent to MCP keys if applicable
      for (const mcpKey of mcpKeys) {
        if (agent.name.toLowerCase().includes(mcpKey.name.toLowerCase()) || (agent.metadata && (agent.metadata as any).agentKeyId === mcpKey.id)) {
          const mcpNodeId = `mcp-${mcpKey.id}`;
          if (!nodes.some(n => n.id === mcpNodeId)) {
            nodes.push({
              id: mcpNodeId,
              label: `MCP Key: ${mcpKey.name}`,
              type: 'DATA_SOURCE',
              accessLevel: 'TOOL_BOUND',
              status: mcpKey.is_active ? 'active' : 'inactive',
              risk: 'HIGH',
              blastRadiusScore: 65,
              details: { allowedTools: mcpKey.allowed_tools },
            });
          }

          connectedResourceIds.push(mcpNodeId);
          edges.push({
            id: `edge-${agent.id}-${mcpKey.id}`,
            source: agentNodeId,
            target: mcpNodeId,
            type: 'TOOL_BOUND',
            label: 'Tool Execution Permission',
            riskLevel: 'HIGH',
          });
        }
      }

      // Link runtime SDK agents to their observed target resources / department scopes
      if (agent.source === 'Runtime Interception' && connectedResourceIds.length === 0) {
        const meta = (agent.metadata as Record<string, any>) || {};
        const dept = meta.department || 'General';
        const resNodeId = `res-dept-${String(dept).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const resRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
          meta.riskTier === 'CRITICAL' ? 'CRITICAL' : meta.riskTier === 'HIGH' ? 'HIGH' : 'MEDIUM';

        if (!nodes.some(n => n.id === resNodeId)) {
          const resObj = {
            id: resNodeId,
            name: `${dept} Data Scope`,
            type: resRisk === 'CRITICAL' ? 's3' : 'api',
            status: 'active',
          };
          connectorMap.set(resNodeId, resObj);
          nodes.push({
            id: resNodeId,
            label: `${dept} Data Scope`,
            type: 'DATA_SOURCE',
            accessLevel: agent.accessLevel || 'MONITORED',
            status: 'active',
            risk: resRisk,
            blastRadiusScore: resRisk === 'CRITICAL' ? 75 : resRisk === 'HIGH' ? 60 : 35,
            details: {
              department: dept,
              resources: meta.resources || [],
            },
          });
        }

        connectedResourceIds.push(resNodeId);
        edges.push({
          id: `edge-${agent.id}-${resNodeId}`,
          source: agentNodeId,
          target: resNodeId,
          type: 'ACCESSES_CONNECTOR',
          label: agent.accessLevel || 'MONITORED',
          riskLevel: resRisk,
        });

        const list = resourceAgentMap.get(resNodeId) || [];
        list.push(agentNodeId);
        resourceAgentMap.set(resNodeId, list);
      }

      agentConnectorsMap.set(agentNodeId, connectedResourceIds);
    }

    // D. Compute Agent-to-Agent Credential Sharing Edges
    const agentList = agents;
    const agentMap = new Map(agents.map(a => [`agent-${a.id}`, a]));

    for (let i = 0; i < agentList.length; i++) {
      for (let j = i + 1; j < agentList.length; j++) {
        const a1 = agentList[i];
        const a2 = agentList[j];
        const r1 = agentConnectorsMap.get(`agent-${a1.id}`) || [];
        const r2 = agentConnectorsMap.get(`agent-${a2.id}`) || [];

        const shared = r1.filter(resId => r2.includes(resId));
        if (shared.length > 0) {
          edges.push({
            id: `edge-share-${a1.id}-${a2.id}`,
            source: `agent-${a1.id}`,
            target: `agent-${a2.id}`,
            type: 'SHARES_CREDENTIAL',
            label: `Shares ${shared.length} connector(s)`,
            riskLevel: 'MEDIUM',
          });
        }
      }
    }

    // E. MULTI-HOP TRANSITIVE BLAST RADIUS & PRIVILEGE ESCALATION DISCOVERY
    for (const agent of agents) {
      const agentNodeId = `agent-${agent.id}`;
      const directResources = agentConnectorsMap.get(agentNodeId) || [];

      // BFS Traversal for 2+ Hop Reach
      const visitedNodes = new Set<string>([agentNodeId]);
      const transitiveConnectors = new Set<string>();
      const transitiveAgents = new Set<string>();
      const escalationPaths: { targetConnector: string; viaAgent: string; reason: string }[] = [];

      // Hop 1: Direct connectors
      const queue: { nodeId: string; hop: number; path: string[] }[] = [];
      for (const resId of directResources) {
        visitedNodes.add(resId);
        queue.push({ nodeId: resId, hop: 1, path: [agent.name, resId] });
      }

      while (queue.length > 0) {
        const { nodeId, hop, path } = queue.shift()!;

        if (hop >= 4) continue; // Cap search at 3 hops for performance

        if (nodeId.startsWith('conn-') || nodeId.startsWith('mcp-') || nodeId.startsWith('llm-') || nodeId.startsWith('res-')) {
          // Connector node -> discover peer agents connected to this resource
          const peerAgents = resourceAgentMap.get(nodeId) || [];
          for (const peerId of peerAgents) {
            if (!visitedNodes.has(peerId)) {
              visitedNodes.add(peerId);
              transitiveAgents.add(peerId);
              queue.push({ nodeId: peerId, hop: hop + 1, path: [...path, peerId] });
            }
          }
        } else if (nodeId.startsWith('agent-')) {
          // Peer Agent node -> discover downstream connectors accessible by this peer agent
          const peerConnectors = agentConnectorsMap.get(nodeId) || [];
          const peerAgentObj = agentMap.get(nodeId);

          for (const downResId of peerConnectors) {
            if (!directResources.includes(downResId)) {
              transitiveConnectors.add(downResId);
            }

            if (!visitedNodes.has(downResId)) {
              visitedNodes.add(downResId);
              queue.push({ nodeId: downResId, hop: hop + 1, path: [...path, downResId] });

              // Evaluate Privilege Escalation:
              // If initial Agent A is RESTRICTED/STANDARD (or lacks direct high-sensitivity access)
              // but Peer Agent B has FULL_ACCESS or accesses a CRITICAL connector (SQL/S3)
              const downConnObj = connectorMap.get(downResId);
              const isHighSensTarget = downResId.includes('sql') || downResId.includes('s3') || (downConnObj && (downConnObj.type === 'sql' || downConnObj.type === 's3'));
              const isPeerElevated = peerAgentObj && (peerAgentObj.accessLevel === 'FULL_ACCESS' || peerAgentObj.accessLevel === 'READ_WRITE');

              if (!directResources.includes(downResId) && (isHighSensTarget || isPeerElevated)) {
                escalationPaths.push({
                  targetConnector: downResId,
                  viaAgent: peerAgentObj?.name || 'Shared Agent',
                  reason: `Transitive privilege escalation: ${agent.name} (${agent.accessLevel || 'STANDARD'}) reaches sensitive resource "${downConnObj?.name || downResId}" via shared connector with ${peerAgentObj?.name || 'Peer Agent'} (${peerAgentObj?.accessLevel || 'FULL_ACCESS'})`,
                });
              }
            }
          }
        }
      }

      const transitiveReachCount = transitiveConnectors.size;
      const isPrivilegeEscalation = escalationPaths.length > 0;
      const escalationReason = isPrivilegeEscalation ? escalationPaths[0].reason : undefined;

      // Mark edge privilege escalation flags
      if (isPrivilegeEscalation) {
        for (const esc of escalationPaths) {
          const matchingEdge = edges.find(
            e => (e.source === agentNodeId && e.target.includes(esc.targetConnector)) ||
                 (e.source === agentNodeId && e.type === 'SHARES_CREDENTIAL')
          );
          if (matchingEdge) {
            matchingEdge.isPrivilegeEscalationPath = true;
            matchingEdge.escalationReason = esc.reason;
            matchingEdge.riskLevel = 'CRITICAL';
          }
        }
      }

      // Compute Multi-hop Blast Radius Score
      const accessWeight =
        agent.accessLevel === 'FULL_ACCESS' || agent.accessLevel === 'READ_WRITE' ? 35 :
        agent.accessLevel === 'HIGH_RISK_MONITORED' ? 40 : 20;

      const rawScore =
        (directResources.length * 20) +
        (transitiveReachCount * 15) +
        (transitiveAgents.size * 10) +
        (isPrivilegeEscalation ? 15 : 0) +
        accessWeight;

      const blastRadiusScore = Math.min(100, Math.max(10, rawScore));

      const risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
        blastRadiusScore >= 75 ? 'CRITICAL' :
        blastRadiusScore >= 50 ? 'HIGH' :
        blastRadiusScore >= 30 ? 'MEDIUM' : 'LOW';

      // Max Impact Action
      let maxImpactAction = `Can access standard system APIs with ${agent.accessLevel || 'MONITORED'} permissions.`;
      const typeUpper = agent.type.toUpperCase();
      const nameLower = agent.name.toLowerCase();

      if (isPrivilegeEscalation) {
        maxImpactAction = `Privilege Escalation Path: ${escalationReason}`;
      } else if (typeUpper.includes('S3') || nameLower.includes('s3') || nameLower.includes('healthcare')) {
        maxImpactAction = `Agent + AWS S3 Connector = Can query, read, and exfiltrate customer PHI and unencrypted cloud storage files.`;
      } else if (typeUpper.includes('SQL') || nameLower.includes('database') || nameLower.includes('financial')) {
        maxImpactAction = `Agent + SQL Connector = Full read/write access to customer financial records and SQL database tables.`;
      } else if (typeUpper.includes('MCP') || typeUpper.includes('TOOL')) {
        maxImpactAction = `Agent + MCP Protocol Key = Execution privilege over bound tool invocations and system scripts.`;
      } else if (typeUpper.includes('SLACK')) {
        maxImpactAction = `Agent + Slack Integration = Can broadcast notifications and exfiltrate internal channel conversations.`;
      }

      nodes.push({
        id: agentNodeId,
        label: agent.name,
        type: 'AGENT',
        agentType: agent.type,
        accessLevel: agent.accessLevel || 'STANDARD',
        status: agent.status || 'active',
        risk,
        blastRadiusScore,
        transitiveReachCount,
        details: {
          source: agent.source,
          postureScore: agent.postureScore,
          discoveredAt: agent.discoveredAt,
          transitiveConnectorsCount: transitiveReachCount,
          transitiveAgentsCount: transitiveAgents.size,
          isPrivilegeEscalation,
          escalationReason,
        },
      });

      // Construct privilege path
      const displayPath = [agent.name, ...directResources.map(r => r.replace(/^(conn|mcp|llm)-/, ''))];
      if (transitiveReachCount > 0) {
        displayPath.push(`+${transitiveReachCount} transitive resource(s)`);
      }

      privilegePaths.push({
        agentId: agent.id,
        agentName: agent.name,
        maxImpactAction,
        riskLevel: risk,
        blastRadiusScore,
        connectedResourcesCount: directResources.length,
        transitiveReachCount,
        isPrivilegeEscalation,
        escalationReason,
        path: displayPath,
      });
    }

    // F. Summary Metrics
    const criticalPaths = privilegePaths.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH' || p.isPrivilegeEscalation);
    const totalBlastRadiusSum = nodes.reduce((sum, n) => sum + n.blastRadiusScore, 0);
    const avgBlastRadius = nodes.length > 0 ? Math.round(totalBlastRadiusSum / nodes.length) : 0;

    return {
      nodes,
      edges,
      privilegePaths: privilegePaths.sort((a, b) => b.blastRadiusScore - a.blastRadiusScore),
      summary: {
        totalAgents: agents.length,
        totalConnectors: connectors.length + mcpKeys.length + llmKeys.length,
        criticalPathsCount: criticalPaths.length,
        avgBlastRadius,
      },
    };
  }
}

