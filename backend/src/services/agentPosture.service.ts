import prisma from '../config/db';
import logger from '../utils/logger';

export interface PostureFindingCandidate {
  framework: 'DPDP' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'EU_AI_ACT';
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  remediation?: string;
}

export interface PostureScanResult {
  agentId: string;
  agentName: string;
  organizationId: string;
  scannedAt: Date;
  postureScore: number;
  frameworkScores: {
    dpdp: number;
    gdpr: number;
    hipaa: number;
    pciDss: number;
    euAiAct: number;
  };
  findings: PostureFindingCandidate[];
}

export class AgentPostureService {
  /**
   * Evaluates an agent's permissions, accessLevel, source, and metadata against 10 compliance rules.
   */
  static evaluateAgentPosture(agent: {
    id: string;
    organizationId: string;
    name: string;
    source?: string | null;
    accessLevel?: string | null;
    permissions?: any;
    metadata?: any;
  }): PostureFindingCandidate[] {
    const findings: PostureFindingCandidate[] = [];
    const source = agent.source || '';
    const accessLevel = agent.accessLevel || '';
    const permissions = agent.permissions || {};

    // -------------------------------------------------------------
    // DPDP RULES (Digital Personal Data Protection Act - India)
    // -------------------------------------------------------------
    // DPDP-RULE-1 (HIGH): READ_WRITE on storage/DB connectors
    if (
      accessLevel === 'READ_WRITE' &&
      ['AWS S3 Connector', 'Google Drive Connector', 'SQL Database Connector'].includes(source)
    ) {
      findings.push({
        framework: 'DPDP',
        ruleId: 'DPDP-RULE-1',
        severity: 'HIGH',
        title: 'DPDP Sec. 6(1) Data Minimization Risk',
        description: 'Agent has READ_WRITE access to personal data storage/database connectors without least-privilege scoping.',
        remediation: 'Restrict connector access status to RESTRICTED or read-only scopes.',
      });
    }

    // DPDP-RULE-2 (MEDIUM): Custom API Connector with READ_WRITE
    if (source === 'Custom API Connector' && accessLevel === 'READ_WRITE') {
      findings.push({
        framework: 'DPDP',
        ruleId: 'DPDP-RULE-2',
        severity: 'MEDIUM',
        title: 'DPDP Sec. 5 Unrestricted API Access',
        description: 'Custom API connector has broad read/write access without explicit processing bounds.',
        remediation: 'Scope API endpoints and enforce data principal consent verification.',
      });
    }

    // -------------------------------------------------------------
    // GDPR RULES (General Data Protection Regulation - EU)
    // -------------------------------------------------------------
    // GDPR-RULE-1 (HIGH): Custom API Connector with READ_WRITE
    if (source === 'Custom API Connector' && accessLevel === 'READ_WRITE') {
      findings.push({
        framework: 'GDPR',
        ruleId: 'GDPR-RULE-1',
        severity: 'HIGH',
        title: 'GDPR Art. 5(1)(c) Excessive Data Access',
        description: 'Custom API agent has active READ_WRITE status exceeding data minimization requirements.',
        remediation: 'Reduce connector access privileges to restricted read-only mode.',
      });
    }

    // GDPR-RULE-2 (MEDIUM): MCP Protocol with FULL_ACCESS
    if (source === 'MCP Protocol' && accessLevel === 'FULL_ACCESS') {
      findings.push({
        framework: 'GDPR',
        ruleId: 'GDPR-RULE-2',
        severity: 'MEDIUM',
        title: 'GDPR Art. 32 Unbounded MCP Execution',
        description: 'MCP agent key has FULL_ACCESS without defined tool boundaries.',
        remediation: 'Configure allowed_tools list on MCP key to restrict execution scope.',
      });
    }

    // -------------------------------------------------------------
    // HIPAA RULES (Health Insurance Portability and Accountability Act)
    // -------------------------------------------------------------
    // HIPAA-RULE-1 (CRITICAL): READ_WRITE on S3 or SQL connectors
    if (
      accessLevel === 'READ_WRITE' &&
      ['AWS S3 Connector', 'SQL Database Connector'].includes(source)
    ) {
      findings.push({
        framework: 'HIPAA',
        ruleId: 'HIPAA-RULE-1',
        severity: 'CRITICAL',
        title: 'HIPAA 45 CFR § 164.312(a)(1) PHI Access Risk',
        description: 'Agent has READ_WRITE access to storage/database connectors capable of storing Protected Health Information (PHI).',
        remediation: 'Enforce Minimum Necessary Standard by restricting database and S3 connector access levels.',
      });
    }

    // HIPAA-RULE-2 (HIGH): Google Drive Connector with READ_WRITE
    if (source === 'Google Drive Connector' && accessLevel === 'READ_WRITE') {
      findings.push({
        framework: 'HIPAA',
        ruleId: 'HIPAA-RULE-2',
        severity: 'HIGH',
        title: 'HIPAA 45 CFR § 164.312(b) Unrestricted Cloud Storage Access',
        description: 'Google Drive connector has active READ_WRITE access to cloud files without audit controls.',
        remediation: 'Configure access restrictions and audit logging for cloud document repositories.',
      });
    }

    // -------------------------------------------------------------
    // PCI-DSS RULES (Payment Card Industry Data Security Standard)
    // -------------------------------------------------------------
    // PCI-RULE-1 (CRITICAL): READ_WRITE on SQL or Custom API connectors
    if (
      accessLevel === 'READ_WRITE' &&
      ['SQL Database Connector', 'Custom API Connector'].includes(source)
    ) {
      findings.push({
        framework: 'PCI_DSS',
        ruleId: 'PCI-RULE-1',
        severity: 'CRITICAL',
        title: 'PCI-DSS Req 7 Cardholder Data Boundary Violation',
        description: 'Agent has active READ_WRITE access to SQL databases or custom APIs within potential cardholder data environment.',
        remediation: 'Segment database/API permissions and enforce strict PCI-DSS access controls.',
      });
    }

    // PCI-RULE-2 (HIGH): MCP Protocol without blocked_tools
    if (
      source === 'MCP Protocol' &&
      (!permissions.blocked_tools || !Array.isArray(permissions.blocked_tools) || permissions.blocked_tools.length === 0)
    ) {
      findings.push({
        framework: 'PCI_DSS',
        ruleId: 'PCI-RULE-2',
        severity: 'HIGH',
        title: 'PCI-DSS Req 2 Unconstrained MCP Tool Execution',
        description: 'MCP agent key lacks blocked tool restrictions, allowing potential execution of dangerous system calls.',
        remediation: 'Populate blocked_tools list for MCP agent keys.',
      });
    }

    // -------------------------------------------------------------
    // EU AI ACT RULES (Regulation (EU) 2024/1689)
    // -------------------------------------------------------------
    // EU-AIA-RULE-1 (HIGH): AI System Registry with CRITICAL risk tier or HIGH_RISK_MONITORED
    if (
      source.endsWith('Registry') &&
      (permissions.riskTier === 'CRITICAL' || accessLevel === 'HIGH_RISK_MONITORED')
    ) {
      findings.push({
        framework: 'EU_AI_ACT',
        ruleId: 'EU-AIA-RULE-1',
        severity: 'HIGH',
        title: 'EU AI Act Art. 14 High-Risk Human Oversight Missing',
        description: 'Critical tier AI system is registered without mandatory human-in-the-loop oversight configuration.',
        remediation: 'Configure human approval workflows for high-risk AI system invocation.',
      });
    }

    // EU-AIA-RULE-2 (MEDIUM): AI System Registry missing riskTier
    if (source.endsWith('Registry') && !permissions.riskTier) {
      findings.push({
        framework: 'EU_AI_ACT',
        ruleId: 'EU-AIA-RULE-2',
        severity: 'MEDIUM',
        title: 'EU AI Act Art. 10 Missing Risk Tier Classification',
        description: 'Registered AI system lacks risk tier classification metadata.',
        remediation: 'Assign a formal risk tier (LOW, MEDIUM, HIGH, CRITICAL) to the registered AI system.',
      });
    }

    return findings;
  }

  /**
   * Computes aggregate and per-framework scores from a set of posture findings.
   * Deduction weights: CRITICAL (-25), HIGH (-15), MEDIUM (-8), LOW (-3). Floor at 0.
   */
  static calculateScores(findings: PostureFindingCandidate[]) {
    const getDeduction = (severity: string) => {
      switch (severity) {
        case 'CRITICAL': return 25;
        case 'HIGH': return 15;
        case 'MEDIUM': return 8;
        case 'LOW': return 3;
        default: return 0;
      }
    };

    const totalDeduction = findings.reduce((acc, f) => acc + getDeduction(f.severity), 0);
    const postureScore = Math.max(0, 100 - totalDeduction);

    const getFrameworkScore = (framework: string) => {
      const fwFindings = findings.filter(f => f.framework === framework);
      const fwDeduction = fwFindings.reduce((acc, f) => acc + getDeduction(f.severity), 0);
      return Math.max(0, 100 - fwDeduction);
    };

    return {
      postureScore,
      frameworkScores: {
        dpdp: getFrameworkScore('DPDP'),
        gdpr: getFrameworkScore('GDPR'),
        hipaa: getFrameworkScore('HIPAA'),
        pciDss: getFrameworkScore('PCI_DSS'),
        euAiAct: getFrameworkScore('EU_AI_ACT'),
      },
    };
  }

  /**
   * Performs posture scan on a single agent, persists findings to agent_posture_findings,
   * and updates Agent.postureScore and Agent.lastPostureScanAt.
   */
  static async scanAgent(organizationId: string, agentId: string): Promise<PostureScanResult> {
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      throw new Error(`Agent ${agentId} not found for organization ${organizationId}`);
    }

    const findings = this.evaluateAgentPosture(agent);
    const scores = this.calculateScores(findings);

    const now = new Date();

    // Transaction: delete old findings for this agent, create new ones, update Agent score
    await prisma.$transaction([
      prisma.agent_posture_findings.deleteMany({
        where: { organizationId, agentId },
      }),
      prisma.agent_posture_findings.createMany({
        data: findings.map(f => ({
          organizationId,
          agentId,
          framework: f.framework,
          ruleId: f.ruleId,
          severity: f.severity,
          title: f.title,
          description: f.description,
          remediation: f.remediation,
          createdAt: now,
        })),
      }),
      prisma.agent.update({
        where: { id: agentId },
        data: {
          postureScore: scores.postureScore,
          lastPostureScanAt: now,
        },
      }),
    ]);

    return {
      agentId: agent.id,
      agentName: agent.name,
      organizationId: agent.organizationId,
      scannedAt: now,
      postureScore: scores.postureScore,
      frameworkScores: scores.frameworkScores,
      findings,
    };
  }

  /**
   * Scans all discovered agents for a tenant in batch.
   */
  static async scanAllAgents(organizationId: string): Promise<{
    totalAgentsScanned: number;
    scannedAt: Date;
    results: PostureScanResult[];
  }> {
    const agents = await prisma.agent.findMany({
      where: { organizationId },
    });

    const results: PostureScanResult[] = [];

    for (const agent of agents) {
      const res = await this.scanAgent(organizationId, agent.id);
      results.push(res);
    }

    return {
      totalAgentsScanned: agents.length,
      scannedAt: new Date(),
      results,
    };
  }

  /**
   * Retrieves stored posture findings for an agent.
   */
  static async getAgentFindings(organizationId: string, agentId: string) {
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, organizationId },
      select: {
        id: true,
        name: true,
        postureScore: true,
        lastPostureScanAt: true,
      },
    });

    if (!agent) {
      throw new Error(`Agent ${agentId} not found for organization ${organizationId}`);
    }

    const findings = await prisma.agent_posture_findings.findMany({
      where: { organizationId, agentId },
      orderBy: { createdAt: 'desc' },
    });

    const scores = this.calculateScores(findings as any);

    return {
      agent,
      postureScore: agent.postureScore ?? scores.postureScore,
      lastPostureScanAt: agent.lastPostureScanAt,
      frameworkScores: scores.frameworkScores,
      findings,
    };
  }
}
