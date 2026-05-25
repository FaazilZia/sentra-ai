import prisma from '../config/db';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export class ModelLifecycleService {
  private static VALID_TRANSITIONS: Record<string, string[]> = {
    DEVELOPMENT: ['TESTING', 'DEPRECATED', 'RETIRED'],
    TESTING: ['STAGING', 'DEPRECATED', 'RETIRED'],
    STAGING: ['PRODUCTION', 'DEPRECATED', 'RETIRED'],
    PRODUCTION: ['DEPRECATED', 'RETIRED'],
    DEPRECATED: ['RETIRED'],
    RETIRED: []
  };

  static async getCurrentStage(aiSystemId: string, organizationId: string) {
    const system = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId },
      select: { lifecycle_stage: true }
    });
    return system?.lifecycle_stage || 'DEVELOPMENT';
  }

  static async getLifecycleHistory(aiSystemId: string, organizationId: string) {
    return await prisma.model_lifecycle_events.findMany({
      where: { ai_system_id: aiSystemId, organizationId },
      orderBy: { effective_date: 'desc' }
    });
  }

  static async transitionStage(
    aiSystemId: string,
    organizationId: string,
    newStage: string,
    notes: string | null,
    userId: string
  ) {
    const system = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId }
    });

    if (!system) {
      throw new Error(`AI System ${aiSystemId} not found`);
    }

    const currentStage = system.lifecycle_stage;
    
    // Validate transition
    const allowed = this.VALID_TRANSITIONS[currentStage] || [];
    if (!allowed.includes(newStage) && currentStage !== newStage) {
      throw new Error(`Invalid stage transition from ${currentStage} to ${newStage}`);
    }

    // Run transition update in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedSystem = await tx.ai_systems.update({
        where: { id: aiSystemId },
        data: { lifecycle_stage: newStage }
      });

      const event = await tx.model_lifecycle_events.create({
        data: {
          id: randomUUID(),
          organizationId,
          ai_system_id: aiSystemId,
          stage: newStage,
          notes,
          changed_by: userId,
          effective_date: new Date()
        }
      });

      return { system: updatedSystem, event };
    });

    logger.info(`AI System ${system.name} transitioned successfully from ${currentStage} to ${newStage}`);

    // Trigger automations or incidents depending on transition destination
    if (newStage === 'PRODUCTION') {
      await this.triggerPostMarketMonitoring(organizationId, aiSystemId, system.name);
    } else if (newStage === 'DEPRECATED') {
      await this.triggerDeprecationIncident(organizationId, aiSystemId, system.name);
    }

    return result;
  }

  private static async triggerPostMarketMonitoring(organizationId: string, aiSystemId: string, systemName: string) {
    try {
      logger.info(`Model advanced to PRODUCTION. Scheduling post-market checks.`);
      
      // Auto-trigger the POST_MARKET_MONITORING automation event
      const { AutomationService } = require('./automation.service');
      await AutomationService.triggerByEvent(organizationId, 'POST_MARKET_MONITORING', {
        aiSystemId,
        systemName,
        message: `AI System ${systemName} transitioned to PRODUCTION. Starting post-market active evaluation.`
      });

      // Schedule the repeatable weekly monitoring check in BullMQ
      const { driftQueue } = require('./queue.service');
      if (driftQueue) {
        await driftQueue.add(
          `post-market-${aiSystemId}`,
          { organizationId, aiSystemId, systemName },
          { repeat: { pattern: '0 0 * * 0' } } // Every Sunday at midnight
        );
        logger.info(`Scheduled repeatable post-market telemetry monitoring queue check successfully.`);
      }
    } catch (err) {
      logger.error('Failed to trigger post-market monitoring logic:', err);
    }
  }

  private static async triggerDeprecationIncident(organizationId: string, aiSystemId: string, systemName: string) {
    try {
      logger.info(`Model deprecated. Creating low-severity deprecation incident.`);
      
      await prisma.incidents.create({
        data: {
          organizationId,
          agent_id: aiSystemId,
          severity: 1, // LOW severity
          action: 'NONE',
          details: `AI System Deprecated: ${systemName}`,
          prompt_excerpt: 'System state transition',
          response_excerpt: 'Transitioned to DEPRECATED stage',
          event_metadata: { aiSystemId, stage: 'DEPRECATED' },
          status: 'unresolved'
        }
      });
    } catch (err) {
      logger.error('Failed to create deprecation incident:', err);
    }
  }
}
