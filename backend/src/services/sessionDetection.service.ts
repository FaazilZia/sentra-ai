import logger from '../utils/logger';
import { cacheService } from './cache.service';

export interface ActionLogEntry {
  timestamp: number;
  agent: string;
  action: string;
  metadata?: any;
}

export interface SessionDetectionResult {
  detected: boolean;
  rule?: 'EXFILTRATION_PATTERN' | 'SCOPE_PROBING' | 'TOOL_DEVIATION';
  title?: string;
  reason?: string;
  risk?: 'high' | 'medium';
  detectionSource: 'session_pattern';
  sessionWindowCount?: number;
}

export class SessionDetectionService {
  private static readonly MAX_WINDOW_SIZE = 10;
  private static readonly WINDOW_TTL_SECONDS = 900; // 15 minutes
  private static memorySessionMap = new Map<string, ActionLogEntry[]>();

  private static getSessionKey(agent: string, organizationId: string, metadata: any = {}): string {
    const sessionId = metadata?.sessionId || metadata?.session_id || 'default';
    return `session_actions:${organizationId}:${agent}:${sessionId}`;
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
      let history: ActionLogEntry[] = [];
      const cached = await cacheService.getOrSet<ActionLogEntry[]>(
        key,
        async () => {
          return this.memorySessionMap.get(key) || [];
        },
        this.WINDOW_TTL_SECONDS
      );

      history = Array.isArray(cached) ? cached : [];
      history.push(entry);

      // Keep only last N actions
      if (history.length > this.MAX_WINDOW_SIZE) {
        history = history.slice(history.length - this.MAX_WINDOW_SIZE);
      }

      // Update memory fallback map
      this.memorySessionMap.set(key, history);

      // Update cache
      await cacheService.getOrSet(
        key,
        async () => history,
        this.WINDOW_TTL_SECONDS
      );
    } catch (err) {
      logger.warn(`[SESSION-DETECTION] Failed to record action for agent ${agent}:`, err);
    }
  }

  /**
   * Evaluates cross-action threat rules over the rolling session context window.
   */
  static async evaluateSessionPattern(agent: string, action: string, organizationId: string, metadata: any = {}): Promise<SessionDetectionResult | null> {
    const key = this.getSessionKey(agent, organizationId, metadata);
    let history: ActionLogEntry[] = [];

    try {
      const cached = await cacheService.getOrSet<ActionLogEntry[]>(
        key,
        async () => this.memorySessionMap.get(key) || [],
        this.WINDOW_TTL_SECONDS
      );
      history = Array.isArray(cached) ? cached : [];
    } catch (err) {
      logger.warn(`[SESSION-DETECTION] Cache retrieval error, using memory map:`, err);
      history = this.memorySessionMap.get(key) || [];
    }

    // Only evaluate sequence threat rules if there is prior history in the session window
    if (history.length === 0) {
      return null;
    }

    // Include current action in evaluation slice
    const windowActions = [...history, { timestamp: Date.now(), agent, action, metadata }];
    const sessionWindowCount = windowActions.length;

    // RULE 1: Data Exfiltration Pattern
    // (Agent reads sensitive data/PHI/PII in history and then calls external API/webhook in current action)
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

    const isOutboundCall = (
      action.toLowerCase().includes('http_post') ||
      action.toLowerCase().includes('external') ||
      action.toLowerCase().includes('webhook') ||
      action.toLowerCase().includes('curl') ||
      action.toLowerCase().includes('evil') ||
      action.toLowerCase().includes('export_data to') ||
      (metadata && metadata.isExternalApi === true)
    );

    if (sensitiveReadInHistory && isOutboundCall) {
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

    // RULE 2: Tool-Call Pattern Deviation
    // (Sudden execution of unexpected administrative or dangerous tool during a standard session)
    const dangerousAdminKeywords = ['delete_database', 'drop_table', 'flush_keys', 'grant_admin', 'bypass_governance'];
    const currentActionLower = action.toLowerCase();
    const containsDangerousAdmin = dangerousAdminKeywords.some(kw => currentActionLower.includes(kw));

    const previousActionsWereStandard = history.length > 0 && history.every(item => {
      const act = item.action.toLowerCase();
      return !dangerousAdminKeywords.some(kw => act.includes(kw));
    });

    if (containsDangerousAdmin && previousActionsWereStandard) {
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

    // RULE 3: Rapid Permission Scope Probing
    // (Agent touches 3+ distinct connectors/tools in rapid succession within 2 mins)
    const now = Date.now();
    const recentTwoMinActions = windowActions.filter(item => now - item.timestamp <= 120000);
    const distinctTools = new Set(recentTwoMinActions.map(item => {
      const match = item.action.match(/^([a-zA-Z0-9_-]+):/);
      return match ? match[1] : item.action.split(' ')[0];
    }));

    if (recentTwoMinActions.length >= 3 && distinctTools.size >= 3) {
      return {
        detected: true,
        rule: 'SCOPE_PROBING',
        title: 'Rapid Permission Scope Probing Detected',
        reason: `[SESSION DETECTED] Rapid multi-connector permission probing detected (${distinctTools.size} distinct scopes touched in < 2 mins).`,
        risk: 'high',
        detectionSource: 'session_pattern',
        sessionWindowCount,
      };
    }

    return null;
  }

  /**
   * Resets session memory for tests or session reset.
   */
  static clearSession(agent: string, organizationId: string, sessionId: string = 'default'): void {
    const key = `session_actions:${organizationId}:${agent}:${sessionId}`;
    this.memorySessionMap.delete(key);
    cacheService.invalidate(key).catch(() => {});
  }
}
