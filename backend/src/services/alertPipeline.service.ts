import logger from '../utils/logger';
import { alertQueue } from './queue.service';
import { SlackService } from './slack.service';
import { PIIScannerService } from './piiScanner.service';
import prisma from '../config/db';

export interface DecisionAlertEvent {
  eventId?: string;
  organizationId: string;
  agent: string;
  action: string;
  status: 'blocked' | 'flagged' | 'allowed';
  risk: 'low' | 'medium' | 'high';
  reason: string;
  impact?: string;
  compliance?: string[];
  matchedPolicy?: string;
  policyName?: string;
  ruleId?: string;
  mode?: string;
  timestamp?: string | Date;
  metadata?: Record<string, any>;
  source?: 'interceptor' | 'mcp' | 'sdk' | 'api';
}

/**
 * Core alert processor executed by BullMQ worker or in-memory fallback.
 * Dispatches to all enabled channel adapters.
 */
export async function processAlertJob(event: DecisionAlertEvent): Promise<void> {
  const { organizationId, status, agent, action, risk, reason, compliance, matchedPolicy } = event;

  const isBlockedOrFlagged = status === 'blocked' || status === 'flagged';
  if (!isBlockedOrFlagged) {
    // Other decision types (e.g. allowed for SIEM/Splunk in Phase 2)
    return;
  }

  // Guarantee no raw PII leaks to outbound notification channels (Slack, Email, SIEM)
  const sanitizedAction = PIIScannerService.redact(action || '');

  const errors: Error[] = [];

  // 1. Channel Adapter: Slack
  try {
    await SlackService.notifyDecisionEvent(organizationId, {
      status,
      agent,
      action: sanitizedAction,
      risk,
      reason,
      policyName: matchedPolicy,
      ruleId: event.ruleId,
      compliance,
      mode: event.mode,
    });
  } catch (slackErr: any) {
    logger.error(`[AlertPipeline] Slack dispatch error for org ${organizationId}:`, slackErr);
    errors.push(slackErr);
  }

  // 2. Channel Adapter: Email Alert
  try {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { alertEmail: true, name: true }
    });

    if (org?.alertEmail && risk === 'high') {
      const { alertService } = require('./alert.service');
      await alertService.sendEmailAlert(organizationId, {
        agent,
        action: sanitizedAction,
        risk,
        reason,
        policyTriggered: matchedPolicy || compliance?.[0] || 'General Safety Policy',
        timestamp: new Date(event.timestamp || Date.now())
      });
    }
  } catch (emailErr: any) {
    logger.error(`[AlertPipeline] Email dispatch error for org ${organizationId}:`, emailErr);
    errors.push(emailErr);
  }

  // If all channels failed and we are in BullMQ, throw to allow retry with backoff
  if (errors.length > 0 && errors.length === 2) {
    throw new Error(`All alert channels failed: ${errors.map(e => e.message).join('; ')}`);
  }
}

export const alertPipeline = {
  /**
   * Non-blocking alert dispatcher.
   * Hands off to BullMQ with exponential backoff retry.
   * If Redis is unavailable, runs asynchronously with local fallback.
   * GUARANTEE: Never throws or delays the calling decision.
   */
  async dispatchDecisionAlert(event: DecisionAlertEvent): Promise<void> {
    try {
      if (!event.timestamp) {
        event.timestamp = new Date().toISOString();
      }

      // If BullMQ alertQueue is connected and not in test environment, enqueue with retry policy
      if (alertQueue && process.env.NODE_ENV !== 'test') {
        try {
          const enqueuePromise = alertQueue.add('decision-alert', event, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: 500,
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Queue timeout')), 1000)
          );
          await Promise.race([enqueuePromise, timeoutPromise]);
          return;
        } catch (enqueueErr) {
          logger.warn('[AlertPipeline] BullMQ enqueue failed or timed out, using async fallback:', enqueueErr);
        }
      }

      // Fallback: asynchronous dispatch detached from request loop
      setImmediate(async () => {
        try {
          await processAlertJob(event);
        } catch (dispatchErr) {
          logger.error('[AlertPipeline] Fallback dispatch failed:', dispatchErr);
        }
      });
    } catch (err) {
      logger.error('[AlertPipeline] Critical error during alert dispatch:', err);
    }
  }
};
