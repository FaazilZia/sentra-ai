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
  details?: any;
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'ACCESSES_CONNECTOR' | 'SHARES_CREDENTIAL' | 'CONNECTED_TO_DATA' | 'TOOL_BOUND';
  label: string;
  riskLevel?: string;
}

export interface PrivilegePath {
  agentId: string;
  agentName: string;
  maxImpactAction: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusScore: number;
  connectedResourcesCount: number;
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
   */
  static async buildGraph(organizationId: string): Promise<AttackGraphPayload> {
    logger.info(`[ATTACK-GRAPH] Building relationship graph for organization: ${organizationId}`);

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

    // Map to track resource connectivity and shared credentials
    const resourceAgentMap = new Map<string, string[]>(); // resourceId -> agentIds
    const agentConnectorsMap = new Map<string, string[]>(); // agentId -> resourceIds

    // A. Add Connector & Data Source Nodes
    for (const conn of connectors) {
      const connNodeId = `conn-${conn.id}`;
      const isSensitive = conn.type === 's3' || conn.type === 'sql' || conn.type === 'gdrive';
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

    // C. Process Agent Nodes & Edges
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

          // Track in resourceAgentMap
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

      agentConnectorsMap.set(agentNodeId, connectedResourceIds);
    }

    // D. Compute Agent-to-Agent connections (Shared Connectors / Credentials)
    const agentList = agents;
    for (let i = 0; i < agentList.length; i++) {
      for (let j = i + 1; j < agentList.length; j++) {
        const a1 = agentList[i];
        const a2 = agentList[j];
        const r1 = agentConnectorsMap.get(`agent-${a1.id}`) || [];
        const r2 = agentConnectorsMap.get(`agent-${a2.id}`) || [];

        // Find shared resources
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

    // E. Finalize Agent Nodes with Blast Radius Scores & Privilege Paths
    for (const agent of agents) {
      const agentNodeId = `agent-${agent.id}`;
      const connectedResources = agentConnectorsMap.get(agentNodeId) || [];
      
      // Calculate blast radius:
      // Direct connectors count * 20 + Transitive shared agents * 15 + Access Level Weight
      let transitiveAgentCount = 0;
      for (const resId of connectedResources) {
        const sharingAgents = resourceAgentMap.get(resId) || [];
        transitiveAgentCount += Math.max(0, sharingAgents.length - 1);
      }

      const accessWeight = 
        agent.accessLevel === 'FULL_ACCESS' || agent.accessLevel === 'READ_WRITE' ? 35 :
        agent.accessLevel === 'HIGH_RISK_MONITORED' ? 40 : 20;

      const rawScore = (connectedResources.length * 20) + (transitiveAgentCount * 15) + accessWeight;
      const blastRadiusScore = Math.min(100, Math.max(10, rawScore));

      const risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
        blastRadiusScore >= 75 ? 'CRITICAL' :
        blastRadiusScore >= 50 ? 'HIGH' :
        blastRadiusScore >= 30 ? 'MEDIUM' : 'LOW';

      // Determine Max Impact Action Statement
      let maxImpactAction = `Can access standard system APIs with ${agent.accessLevel || 'MONITORED'} permissions.`;
      const typeUpper = agent.type.toUpperCase();
      const nameLower = agent.name.toLowerCase();

      if (typeUpper.includes('S3') || nameLower.includes('s3') || nameLower.includes('healthcare')) {
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
        details: {
          source: agent.source,
          postureScore: agent.postureScore,
          discoveredAt: agent.discoveredAt,
        },
      });

      // Construct privilege path
      privilegePaths.push({
        agentId: agent.id,
        agentName: agent.name,
        maxImpactAction,
        riskLevel: risk,
        blastRadiusScore,
        connectedResourcesCount: connectedResources.length,
        path: [agent.name, ...connectedResources.map(r => r.replace(/^(conn|mcp|llm)-/, ''))],
      });
    }

    // F. Compute Summary Metrics
    const criticalPaths = privilegePaths.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH');
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
