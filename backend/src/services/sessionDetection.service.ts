import logger from '../utils/logger';
import { cacheService } from './cache.service';
import { evaluateMemoryWriteAnomaly } from './semanticRiskEngine';

export interface ActionLogEntry {
  timestamp: number;
  agent: string;
  action: string;
  metadata?: any;
}

export type DetectionSourceType =
  | 'session_pattern'
  | 'behavioral_deviation'
  | 'memory_anomaly_heuristic'
  | 'multi_agent_correlation';

export interface SessionDetectionResult {
  detected: boolean;
  rule?:
    | 'EXFILTRATION_PATTERN'
    | 'SCOPE_PROBING'
    | 'TOOL_DEVIATION'
    | 'BEHAVIORAL_DEVIATION'
    | 'MEMORY_ANOMALY'
    | 'MULTI_AGENT_CORRELATION';
  title?: string;
  reason?: string;
  risk?: 'high' | 'medium';
  detectionSource: DetectionSourceType;
  sessionWindowCount?: number;
}

export interface AgentBaseline {
  totalActions: number;
  toolCounts: Record<string, number>;
}

export interface SuspiciousLogEntry {
  agent: string;
  action: string;
  connector: string;
  timestamp: number;
}

export class SessionDetectionService {
  private static readonly MAX_WINDOW_SIZE = 10;
  private static readonly WINDOW_TTL_SECONDS = 900; // 15 minutes
  private static readonly BASELINE_TTL_SECONDS = 2592000; // 30 days Redis persistence
  private static readonly MIN_BASELINE_THRESHOLD = 10; // Cold-start protection sample size

  private static memorySessionMap = new Map<string, ActionLogEntry[]>();
  private static memoryBaselineMap = new Map<string, AgentBaseline>();
  private static memoryCorrelationMap = new Map<string, SuspiciousLogEntry[]>();

  private static getSessionKey(agent: string, organizationId: string, metadata: any = {}): string {
    const sessionId = metadata?.sessionId || metadata?.session_id || 'default';
    return `session_actions:${organizationId}:${agent}:${sessionId}`;
  }

  private static getBaselineKey(agent: string, organizationId: string): string {
    return `agent_tool_baseline:${organizationId}:${agent}`;
  }

  private static getCorrelationKey(organizationId: string): string {
    return `recent_suspicious_actions:${organizationId}`;
  }

  public static extractToolName(action: string): string {
    const match = action.match(/^([a-zA-Z0-9_-]+):/);
    if (match) return match[1].toLowerCase();
    return action.split(' ')[0].toLowerCase();
  }

  public static isReadOnlyAction(action: string): boolean {
    const lower = action.toLowerCase();
    const toolName = this.extractToolName(lower);
    return (
      lower.startsWith('read_') ||
      lower.startsWith('get_') ||
      lower.startsWith('list_') ||
      lower.startsWith('fetch_') ||
      lower.startsWith('view_') ||
      lower.startsWith('check_') ||
      lower.startsWith('search_') ||
      toolName.startsWith('read_') ||
      toolName.startsWith('get_') ||
      toolName.startsWith('list_') ||
      toolName.startsWith('fetch_') ||
      toolName.startsWith('view_') ||
      ['health_check', 'ping', 'status', 'get_time', 'fetch_time', 'get_weather', 'fetch_weather'].includes(lower)
    );
  }

  /**
   * Retrieves or initializes Redis-backed agent behavioral baseline.
   */
  static async getAgentBaseline(agent: string, organizationId: string): Promise<AgentBaseline> {
    const key = this.getBaselineKey(agent, organizationId);
    try {
      const cached = await cacheService.getOrSet<AgentBaseline>(
        key,
        async () => this.memoryBaselineMap.get(key) || { totalActions: 0, toolCounts: {} },
        this.BASELINE_TTL_SECONDS
      );
      if (cached && typeof cached.totalActions === 'number') {
        return cached;
      }
    } catch (err) {
      logger.warn(`[SESSION-DETECTION] Failed to fetch baseline for ${agent}:`, err);
    }
    return this.memoryBaselineMap.get(key) || { totalActions: 0, toolCounts: {} };
  }

  /**
   * Updates Redis-backed agent behavioral baseline with current action's tool.
   */
  static async updateAgentBaseline(agent: string, organizationId: string, action: string): Promise<void> {
    const toolName = this.extractToolName(action);
    const key = this.getBaselineKey(agent, organizationId);
    const baseline = await this.getAgentBaseline(agent, organizationId);

    baseline.totalActions += 1;
    baseline.toolCounts[toolName] = (baseline.toolCounts[toolName] || 0) + 1;

    this.memoryBaselineMap.set(key, baseline);
    await cacheService.set(key, baseline, this.BASELINE_TTL_SECONDS);
  }

  /**
   * Records a suspicious action into the multi-agent correlation window (5-minute TTL).
   */
  static async recordSuspiciousAction(agent: string, organizationId: string, action: string, metadata: any = {}): Promise<void> {
    const corrKey = this.getCorrelationKey(organizationId);
    const connector = metadata?.connectorId || metadata?.connector_id || metadata?.connectorType || this.extractToolName(action);
    
    let list: SuspiciousLogEntry[] = [];
    try {
      const cached = await cacheService.getOrSet<SuspiciousLogEntry[]>(
        corrKey,
        async () => this.memoryCorrelationMap.get(corrKey) || [],
        300
      );
      list = Array.isArray(cached) ? cached : [];
    } catch (err) {
      list = this.memoryCorrelationMap.get(corrKey) || [];
    }

    list.push({ agent, action, connector, timestamp: Date.now() });

    // Keep recent 30 actions within 5 mins
    const now = Date.now();
    list = list.filter(item => now - item.timestamp <= 300000).slice(-30);

    this.memoryCorrelationMap.set(corrKey, list);
    await cacheService.set(corrKey, list, 300);
  }

  /**
   * Retrieves current session history, prioritizing in-memory map for process consistency with Redis fallback.
   */
  private static async getSessionHistory(key: string): Promise<ActionLogEntry[]> {
    const inMem = this.memorySessionMap.get(key);
    if (inMem && Array.isArray(inMem)) {
      return [...inMem];
    }
    try {
      const cached = await cacheService.get<ActionLogEntry[]>(key);
      if (cached && Array.isArray(cached)) {
        this.memorySessionMap.set(key, cached);
        return [...cached];
      }
    } catch (err) {
      logger.warn(`[SESSION-DETECTION] Cache retrieval error for ${key}:`, err);
    }
    return [];
  }

  /**
   * Records an agent's action entry into the session context sliding window.
   */
  static async recordAction(agent: string, organizationId: string, action: string, metadata: any = {}): Promise<void> {
    const key = this.getSessionKey(agent, organizationId, metadata);
    const entry: ActionLogEntry = {
      timestamp: Date.now(),
      agent,
      action,
      metadata,
    };

    try {
      const history = await this.getSessionHistory(key);
      history.push(entry);

      const trimmedHistory = history.length > this.MAX_WINDOW_SIZE
        ? history.slice(history.length - this.MAX_WINDOW_SIZE)
        : history;

      this.memorySessionMap.set(key, trimmedHistory);
      await cacheService.set(key, trimmedHistory, this.WINDOW_TTL_SECONDS);

      // Accumulate baseline
      await this.updateAgentBaseline(agent, organizationId, action);
    } catch (err) {
      logger.warn(`[SESSION-DETECTION] Failed to record action for agent ${agent}:`, err);
    }
  }

  /**
   * Evaluates cross-action threat rules, behavioral baseline deviations, memory anomalies, and multi-agent correlation.
   */
  static async evaluateSessionPattern(
    agent: string,
    action: string,
    organizationId: string,
    metadata: any = {}
  ): Promise<SessionDetectionResult | null> {
    const key = this.getSessionKey(agent, organizationId, metadata);
    const history = await this.getSessionHistory(key);

    const windowActions = [...history, { timestamp: Date.now(), agent, action, metadata }];
    const sessionWindowCount = windowActions.length;

    // --- DETECTOR 1: Memory-Write Anomaly Heuristic ---
    const isMemoryAction =
      action.toLowerCase().includes('memory') ||
      action.toLowerCase().includes('context') ||
      metadata?.isMemoryWrite === true ||
      metadata?.contentType === 'memory';

    if (isMemoryAction) {
      const memoryContent = metadata?.memoryContent || metadata?.content || metadata?.text || action;
      const anomalyResult = await evaluateMemoryWriteAnomaly(memoryContent);
      if (anomalyResult.isAnomaly) {
        await this.recordSuspiciousAction(agent, organizationId, action, metadata);
        return {
          detected: true,
          rule: 'MEMORY_ANOMALY',
          title: 'Memory Write Anomaly Detected',
          reason: `[MEMORY ANOMALY] ${anomalyResult.reason}`,
          risk: 'high',
          detectionSource: 'memory_anomaly_heuristic',
          sessionWindowCount,
        };
      }
    }

    // --- DETECTOR 2: Multi-Agent Incident Correlation ---
    const connector = metadata?.connectorId || metadata?.connector_id || metadata?.connectorType || this.extractToolName(action);
    const corrKey = this.getCorrelationKey(organizationId);
    let recentSuspicious: SuspiciousLogEntry[] = [];
    try {
      const cached = await cacheService.getOrSet<SuspiciousLogEntry[]>(
        corrKey,
        async () => this.memoryCorrelationMap.get(corrKey) || [],
        300
      );
      recentSuspicious = Array.isArray(cached) ? cached : [];
    } catch (err) {
      recentSuspicious = this.memoryCorrelationMap.get(corrKey) || [];
    }

    const now = Date.now();
    recentSuspicious = recentSuspicious.filter(item => now - item.timestamp <= 300000);

    const correlatedEntry = recentSuspicious.find(
      item => item.agent !== agent && item.connector.toLowerCase() === connector.toLowerCase()
    );

    if (correlatedEntry) {
      await this.recordSuspiciousAction(agent, organizationId, action, metadata);
      return {
        detected: true,
        rule: 'MULTI_AGENT_CORRELATION',
        title: 'Multi-Agent Security Correlation Detected',
        reason: `[MULTI-AGENT CORRELATION] Suspicious activity correlated across multiple agents ("${correlatedEntry.agent}" and "${agent}") sharing connector/scope "${connector}" within 5 minutes.`,
        risk: 'high',
        detectionSource: 'multi_agent_correlation',
        sessionWindowCount,
      };
    }

    // --- DETECTOR 3: Agent Behavioral Baseline Deviation ---
    const baseline = await this.getAgentBaseline(agent, organizationId);
    const toolName = this.extractToolName(action);

    // Cold-start check: require at least MIN_BASELINE_THRESHOLD (10) logged actions before evaluating deviation
    if (baseline.totalActions >= this.MIN_BASELINE_THRESHOLD) {
      const count = baseline.toolCounts[toolName] || 0;
      const isUnseenTool = count === 0;
      const dangerousKeywords = ['delete', 'drop', 'grant', 'admin', 'flush', 'bypass', 'exfiltrate', 'export_all'];
      const actionLower = action.toLowerCase();
      const isDangerousOrAdmin = dangerousKeywords.some(kw => actionLower.includes(kw));

      if (isUnseenTool && (isDangerousOrAdmin || Object.keys(baseline.toolCounts).length >= 2)) {
        await this.recordSuspiciousAction(agent, organizationId, action, metadata);
        return {
          detected: true,
          rule: 'BEHAVIORAL_DEVIATION',
          title: 'Agent Behavioral Baseline Deviation',
          reason: `[BEHAVIORAL DEVIATION] Agent "${agent}" executed tool "${action}" which strongly deviates from its historical tool-call distribution baseline (${baseline.totalActions} logged actions).`,
          risk: 'high',
          detectionSource: 'behavioral_deviation',
          sessionWindowCount,
        };
      }
    }

    // --- DETECTOR 4: Fixed Session Pattern Sequence Rules (Exfiltration, Probing, Tool Deviation) ---
    if (history.length > 0) {
      // Rule 4a: Data Exfiltration Pattern
      const sensitiveReadInHistory = history.some(item => {
        const act = item.action.toLowerCase();
        const meta = JSON.stringify(item.metadata || {}).toLowerCase();
        return (
          act.includes('phi') ||
          act.includes('pii') ||
          act.includes('read_s3') ||
          act.includes('select') ||
          act.includes('export_customer') ||
          act.includes('patient') ||
          meta.includes('phi') ||
          meta.includes('pii')
        );
      });

      const isOutboundCall =
        action.toLowerCase().includes('http_post') ||
        action.toLowerCase().includes('external') ||
        action.toLowerCase().includes('webhook') ||
        action.toLowerCase().includes('curl') ||
        action.toLowerCase().includes('evil') ||
        action.toLowerCase().includes('export_data to') ||
        (metadata && metadata.isExternalApi === true);

      if (sensitiveReadInHistory && isOutboundCall) {
        await this.recordSuspiciousAction(agent, organizationId, action, metadata);
        return {
          detected: true,
          rule: 'EXFILTRATION_PATTERN',
          title: 'Session Data Exfiltration Pattern Detected',
          reason: `[SESSION DETECTED] Agent read sensitive records and attempted external API exfiltration in session (${sessionWindowCount} actions).`,
          risk: 'high',
          detectionSource: 'session_pattern',
          sessionWindowCount,
        };
      }

      // Rule 4b: Tool-Call Pattern Deviation
      const dangerousAdminKeywords = ['delete_database', 'drop_table', 'flush_keys', 'grant_admin', 'bypass_governance'];
      const currentActionLower = action.toLowerCase();
      const containsDangerousAdmin = dangerousAdminKeywords.some(kw => currentActionLower.includes(kw));

      const previousActionsWereStandard = history.every(item => {
        const act = item.action.toLowerCase();
        return !dangerousAdminKeywords.some(kw => act.includes(kw));
      });

      if (containsDangerousAdmin && previousActionsWereStandard) {
        await this.recordSuspiciousAction(agent, organizationId, action, metadata);
        return {
          detected: true,
          rule: 'TOOL_DEVIATION',
          title: 'Session Tool Execution Deviation',
          reason: `[SESSION DETECTED] Sharp tool-call deviation: Admin tool execution detected in standard user session context.`,
          risk: 'high',
          detectionSource: 'session_pattern',
          sessionWindowCount,
        };
      }

      // Rule 4c: Rapid Scope Probing
      // Exclude read-only/low-risk actions from scope probing block and active tool counting
      if (!SessionDetectionService.isReadOnlyAction(action)) {
        const recentTwoMinActions = windowActions.filter(item => now - item.timestamp <= 120000);
        const nonReadActions = recentTwoMinActions.filter(item => !SessionDetectionService.isReadOnlyAction(item.action));
        const distinctNonReadTools = new Set(
          nonReadActions.map(item => this.extractToolName(item.action))
        );

        if (nonReadActions.length >= 3 && distinctNonReadTools.size >= 3) {
          await this.recordSuspiciousAction(agent, organizationId, action, metadata);
          return {
            detected: true,
            rule: 'SCOPE_PROBING',
            title: 'Rapid Permission Scope Probing Detected',
            reason: `[SESSION DETECTED] Rapid multi-connector permission probing detected (${distinctNonReadTools.size} distinct active scopes touched in < 2 mins).`,
            risk: 'high',
            detectionSource: 'session_pattern',
            sessionWindowCount,
          };
        }
      }
    }

    return null;
  }

  /**
   * Clears session, baseline, and correlation state for tests.
   */
  static clearSession(agent: string, organizationId: string, sessionId: string = 'default'): void {
    const sessionKey = this.getSessionKey(agent, organizationId, { sessionId });
    this.memorySessionMap.delete(sessionKey);
    cacheService.invalidate(sessionKey).catch(() => {});
  }

  static clearBaseline(agent: string, organizationId: string): void {
    const baseKey = this.getBaselineKey(agent, organizationId);
    this.memoryBaselineMap.delete(baseKey);
    cacheService.invalidate(baseKey).catch(() => {});
  }

  static clearCorrelations(organizationId: string): void {
    const corrKey = this.getCorrelationKey(organizationId);
    this.memoryCorrelationMap.delete(corrKey);
    cacheService.invalidate(corrKey).catch(() => {});
  }
}

