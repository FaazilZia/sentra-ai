import { getRedisClient } from '../config/redis';
import prisma from '../config/db';
import logger from '../utils/logger';
import { NotificationService } from './notification.service';
import { SlackService } from './slack.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentBaseline {
  agentId: string;
  orgId: string;
  avgRequestsPerHour: number;
  avgRiskScore: number;
  commonResources: string[];
  activeHours: number[]; // 0–23 UTC
  totalRequests: number;
  firstSeenAt?: string; // ISO
  lastUpdated: string; // ISO
}

export interface DriftCheckResult {
  type: 'volume_spike' | 'new_resource' | 'risk_score_increase' | 'unusual_hours';
  severity: 'low' | 'medium' | 'high';
  message: string;
  baselineValue: number;
  currentValue: number;
}

// ─── Risk mapping ─────────────────────────────────────────────────────────────

function riskToNumber(risk: string | null | undefined): number {
  if (risk === 'high') return 80;
  if (risk === 'medium') return 50;
  return 20; // low / unknown
}

// ─── Redis key helpers ────────────────────────────────────────────────────────

function baselineKey(orgId: string, agentId: string): string {
  return `baseline:${orgId}:${agentId}`;
}

function recentCountKey(orgId: string, agentId: string): string {
  return `recent_count:${orgId}:${agentId}`;
}

// ─── Baseline CRUD ────────────────────────────────────────────────────────────

export async function getBaseline(
  agentId: string,
  orgId: string
): Promise<AgentBaseline | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(baselineKey(orgId, agentId));
    if (!raw) return null;
    return JSON.parse(raw) as AgentBaseline;
  } catch (err) {
    logger.warn(`[DriftDetection] Failed to read baseline for ${agentId}:`, err);
    return null;
  }
}

/**
 * Called after every action evaluation.
 * Updates the rolling baseline stored in Redis with a 7-day TTL.
 */
export async function updateBaseline(
  agentId: string,
  orgId: string,
  action: { metadata?: Record<string, any> },
  riskScore: number
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return; // Degrade gracefully when Redis is absent

  const key = baselineKey(orgId, agentId);
  const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
  const ALPHA = 0.1; // EMA smoothing factor — weight for newest observation

  try {
    const existing = await getBaseline(agentId, orgId);
    const currentHour = new Date().getUTCHours();
    const nowIso = new Date().toISOString();

    const resource =
      action.metadata?.path ||
      action.metadata?.url ||
      action.metadata?.table ||
      action.metadata?.resource;

    if (!existing) {
      // First ever observation — seed the baseline
      const baseline: AgentBaseline = {
        agentId,
        orgId,
        avgRequestsPerHour: 10,
        avgRiskScore: riskScore,
        commonResources: resource ? [resource] : [],
        activeHours: [currentHour],
        totalRequests: 1,
        firstSeenAt: nowIso,
        lastUpdated: nowIso,
      };
      await redis.set(key, JSON.stringify(baseline), 'EX', TTL_SECONDS);
      return;
    }

    // Exponential moving average for numeric metrics
    const newAvgRisk =
      existing.avgRiskScore * (1 - ALPHA) + riskScore * ALPHA;

    // Estimate requests/hr using EMA on actual recent hourly request count
    const recentRequests = await getRecentRequestCount(agentId, orgId);
    const observedHourlyRate = Math.max(recentRequests, 1);
    const newAvgReqPerHr = Math.max(
      existing.avgRequestsPerHour * (1 - ALPHA) + observedHourlyRate * ALPHA,
      5
    );

    // Keep up to 50 most common resources
    let resources = existing.commonResources ?? [];
    if (resource && !resources.includes(resource)) {
      resources = [...resources, resource].slice(-50);
    }

    // Track active hours (dedup)
    const activeHours = Array.from(
      new Set([...existing.activeHours, currentHour])
    ).sort((a, b) => a - b);

    const updated: AgentBaseline = {
      agentId,
      orgId,
      avgRequestsPerHour: Number.parseFloat(newAvgReqPerHr.toFixed(4)),
      avgRiskScore: Number.parseFloat(newAvgRisk.toFixed(4)),
      commonResources: resources,
      activeHours,
      totalRequests: (existing.totalRequests ?? 0) + 1,
      firstSeenAt: existing.firstSeenAt || existing.lastUpdated || nowIso,
      lastUpdated: nowIso,
    };

    await redis.set(key, JSON.stringify(updated), 'EX', TTL_SECONDS);
  } catch (err) {
    logger.warn(`[DriftDetection] Failed to update baseline for ${agentId}:`, err);
  }
}

/**
 * Returns the count of requests made by agentId in the last 60 minutes,
 * using the logs table as the source of truth.
 */
async function getRecentRequestCount(
  agentId: string,
  orgId: string
): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.logs.count({
      where: {
        organizationId: orgId,
        agent: agentId,
        timestamp: { gte: oneHourAgo },
      },
    });
    return count;
  } catch {
    return 0;
  }
}

// ─── Drift detection ──────────────────────────────────────────────────────────

const MIN_CALIBRATION_REQUESTS = 25;
const RAPID_FIRE_BURST_MS = 5000;

/**
 * Runs 4 drift checks after every action evaluation.
 * Returns an array of DriftCheckResult (empty = no drift detected).
 * Suppresses statistical drift alerts during initial baseline calibration (<25 requests)
 * or when requests arrive in a rapid-fire automated test burst (<5s inter-arrival).
 */
export async function detectDrift(
  agentId: string,
  orgId: string,
  currentAction: { action?: string; metadata?: Record<string, any> },
  currentRiskScore: number
): Promise<DriftCheckResult[]> {
  const alerts: DriftCheckResult[] = [];

  const baseline = await getBaseline(agentId, orgId);
  if (!baseline) return alerts; // No baseline yet — skip

  // Do not fire statistical drift alerts until baseline has sufficient calibration history
  if ((baseline.totalRequests ?? 0) < MIN_CALIBRATION_REQUESTS) {
    return alerts;
  }

  // Suppress drift alerts from rapid-fire test script timing (<5s since previous request)
  if (baseline.lastUpdated) {
    const elapsedMs = Date.now() - new Date(baseline.lastUpdated).getTime();
    if (elapsedMs >= 0 && elapsedMs < RAPID_FIRE_BURST_MS) {
      return alerts;
    }
  }

  // ── Check 1: Volume spike (>3× baseline requests/hr, minimum 50/hr) ────────
  const recentRequests = await getRecentRequestCount(agentId, orgId);
  const volumeThreshold = Math.max(baseline.avgRequestsPerHour * 3, 50);
  if (recentRequests >= volumeThreshold) {
    alerts.push({
      type: 'volume_spike',
      severity: 'high',
      message: `Agent making ${recentRequests} requests/hr vs baseline of ${baseline.avgRequestsPerHour.toFixed(1)}`,
      baselineValue: baseline.avgRequestsPerHour,
      currentValue: recentRequests,
    });
  }

  // ── Check 2: Risk score increase (>50% above EMA baseline) ────────────────
  if (
    baseline.avgRiskScore > 0 &&
    currentRiskScore > baseline.avgRiskScore * 1.5
  ) {
    alerts.push({
      type: 'risk_score_increase',
      severity: 'medium',
      message: `Risk score ${currentRiskScore} is >50% above baseline of ${baseline.avgRiskScore.toFixed(1)}`,
      baselineValue: baseline.avgRiskScore,
      currentValue: currentRiskScore,
    });
  }

  // ── Check 3: New resource access ──────────────────────────────────────────
  const resource =
    currentAction.metadata?.path ||
    currentAction.metadata?.url ||
    currentAction.metadata?.table ||
    currentAction.metadata?.resource;

  if (
    resource &&
    baseline.commonResources.length > 0 &&
    !baseline.commonResources.includes(resource)
  ) {
    alerts.push({
      type: 'new_resource',
      severity: 'medium',
      message: `Agent accessed new resource: ${resource}`,
      baselineValue: 0,
      currentValue: 1,
    });
  }

  // ── Check 4: Unusual operating hours ────────────────────────────────────
  const currentHour = new Date().getUTCHours();
  if (
    baseline.activeHours.length >= 3 && // Only fire once we have enough history
    !baseline.activeHours.includes(currentHour)
  ) {
    alerts.push({
      type: 'unusual_hours',
      severity: 'low',
      message: `Agent active at hour ${currentHour} UTC, outside its normal hours [${baseline.activeHours.join(', ')}]`,
      baselineValue: 0,
      currentValue: currentHour,
    });
  }

  return alerts;
}

/**
 * Persists drift alerts to the database.
 * Uses the existing drift_alerts table schema.
 */
export async function persistDriftAlerts(
  agentId: string,
  orgId: string,
  checks: DriftCheckResult[]
): Promise<void> {
  if (checks.length === 0) return;

  for (const c of checks) {
    try {
      const driftAlert = await prisma.drift_alerts.create({
        data: {
          organizationId: orgId,
          agentId,
          type: c.type,
          severity: c.severity,
          description: c.message,
          message: c.message,
          status: 'open',
          driftScore: c.currentValue / Math.max(c.baselineValue, 1),
          unexpectedActions: [],
          detectedAt: new Date(),
        }
      });

      await NotificationService.notifyDriftDetected(
        orgId,
        `Drift Alert: ${c.type}`,
        driftAlert.description,
        'drift',
        driftAlert.id
      );

      await SlackService.notifyDriftDetected(
        orgId,
        agentId,
        c.type,
        c.severity === 'high' ? 'High' : 'Medium'
      );
    } catch (err) {
      logger.warn(`[DriftDetection] Failed to persist drift alert:`, err);
    }
  }
}
