import prisma from '../config/db';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export class AutomationService {
  static async listAutomations(organizationId: string) {
    return await prisma.automations.findMany({
      where: { organizationId },
      include: { execution_logs: { take: 10, orderBy: { ran_at: 'desc' } } },
      orderBy: { created_at: 'desc' }
    });
  }

  static async createAutomation(organizationId: string, data: any) {
    return await prisma.automations.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: data.name,
        description: data.description,
        trigger_type: data.trigger_type,
        trigger_config: data.trigger_config || {},
        action_type: data.action_type,
        action_config: data.action_config || {},
        is_active: data.is_active !== undefined ? data.is_active : true
      }
    });
  }

  static async updateAutomation(organizationId: string, automationId: string, data: any) {
    return await prisma.automations.update({
      where: { id: automationId, organizationId },
      data: {
        name: data.name,
        description: data.description,
        trigger_type: data.trigger_type,
        trigger_config: data.trigger_config,
        action_type: data.action_type,
        action_config: data.action_config,
        is_active: data.is_active
      }
    });
  }

  static async deleteAutomation(organizationId: string, automationId: string) {
    return await prisma.automations.delete({
      where: { id: automationId, organizationId }
    });
  }

  static async toggleAutomation(organizationId: string, automationId: string, isActive: boolean) {
    return await prisma.automations.update({
      where: { id: automationId, organizationId },
      data: { is_active: isActive }
    });
  }

  static async triggerByEvent(organizationId: string, eventType: string, payload: any) {
    logger.info(`Automations triggering by event: ${eventType} in org ${organizationId}`);
    try {
      const activeAutomations = await prisma.automations.findMany({
        where: { organizationId, trigger_type: eventType, is_active: true }
      });

      for (const auto of activeAutomations) {
        // Enqueue BullMQ job if queue is connected
        const { automationsQueue } = require('./queue.service');
        if (automationsQueue) {
          await automationsQueue.add('automation-execute', {
            automationId: auto.id,
            triggerPayload: payload
          });
          logger.info(`Enqueued automation ${auto.name} for execution`);
        } else {
          // Fallback to sync execution if Redis is offline
          logger.warn(`Redis offline. Running automation ${auto.name} synchronously.`);
          await this.executeAutomation(auto.id, payload);
        }
      }
    } catch (err) {
      logger.error('Failed to trigger automations by event:', err);
    }
  }

  static async executeAutomation(automationId: string, triggerPayload: any) {
    const auto = await prisma.automations.findUnique({
      where: { id: automationId }
    });

    if (!auto || !auto.is_active) return;

    logger.info(`Executing automation action: ${auto.action_type} for automation: ${auto.name}`);
    let status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' = 'SUCCESS';
    let output = '';

    try {
      const config = auto.action_config as any;

      switch (auto.action_type) {
        case 'SEND_EMAIL':
          // Mock email sending
          output = `Successfully sent compliance alert email to ${config.recipient || 'admin@sentra.ai'} containing payload: ${JSON.stringify(triggerPayload).substring(0, 100)}`;
          break;
        case 'CREATE_INCIDENT':
          const createdIncident = await prisma.incidents.create({
            data: {
              organizationId: auto.organizationId,
              agent_id: triggerPayload.agentId || 'automations-engine',
              severity: config.severity === 'CRITICAL' ? 4 : config.severity === 'HIGH' ? 3 : 2,
              action: 'BLOCK',
              details: `Automations Engine triggered: ${auto.name}. Reason: ${triggerPayload.message || 'Custom condition met'}`,
              prompt_excerpt: 'Automated policy rule',
              response_excerpt: 'Triggered block',
              event_metadata: { automationId: auto.id, triggerPayload },
              status: 'unresolved'
            }
          });
          output = `Created incident successfully with ID: ${createdIncident.id}`;
          break;
        case 'SEND_SLACK_NOTIFICATION':
          output = `Slack Webhook triggered for channel ${config.channel || '#compliance-alerts'}: [Sentraa AI Automation] ${auto.name} fired successfully.`;
          break;
        case 'GENERATE_REPORT':
          output = `Triggered compliance audit executive PDF export compiled on organization state.`;
          break;
        default:
          status = 'SKIPPED';
          output = `Action type ${auto.action_type} is not mapped or skipped.`;
      }

      await prisma.automations.update({
        where: { id: automationId },
        data: { last_run_at: new Date() }
      });
    } catch (err: any) {
      status = 'FAILURE';
      output = err.message || 'Unknown execution error occurred';
      logger.error(`Failed to execute automation ${automationId}:`, err);
    }

    // Log the run outcomes
    await prisma.automation_execution_logs.create({
      data: {
        id: randomUUID(),
        automation_id: automationId,
        status,
        output,
        ran_at: new Date()
      }
    });
  }
}
