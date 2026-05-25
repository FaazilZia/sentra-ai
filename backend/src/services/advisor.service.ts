import Anthropic from '@anthropic-ai/sdk';
import prisma from '../config/db';
import { EuAiActService } from './euAiAct.service';
import { NistAiRmfService } from './nistAiRmf.service';
import { Iso42001Service } from './iso42001.service';
import { Iso27001Service } from './iso27001.service';
import logger from '../utils/logger';

export class AdvisorService {
  private static getClient(): Anthropic | null {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new Anthropic({ apiKey });
  }

  static async getCompliancePosture(organizationId: string) {
    try {
      const [euAct, nist, iso42001, iso27001, incidents, driftAlerts] = await Promise.all([
        EuAiActService.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
        NistAiRmfService.getFrameworkOverview(organizationId).catch(() => ({ score: 0 })),
        Iso42001Service.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
        Iso27001Service.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
        prisma.incidents.count({ where: { organizationId, status: 'unresolved' } }),
        prisma.drift_alerts.count({ where: { organizationId, status: 'open' } })
      ]);

      return {
        euAiActScore: euAct.summary?.compliance_score || 0,
        nistScore: nist.score || 0,
        iso42001Score: iso42001.summary?.compliance_score || 0,
        iso27001Score: iso27001.summary?.compliance_score || 0,
        openIncidents: incidents,
        activeDrifts: driftAlerts
      };
    } catch (err) {
      logger.error('Failed to get compliance posture for advisor:', err);
      return {
        euAiActScore: 0,
        nistScore: 0,
        iso42001Score: 0,
        iso27001Score: 0,
        openIncidents: 0,
        activeDrifts: 0
      };
    }
  }

  static async getSuggestions(organizationId: string): Promise<string[]> {
    const posture = await this.getCompliancePosture(organizationId);
    const suggestions: string[] = [];

    if (posture.openIncidents > 0) {
      suggestions.push(`How do we resolve the ${posture.openIncidents} open incidents?`);
    } else {
      suggestions.push("Show me a summary of our active incidents.");
    }

    if (posture.activeDrifts > 0) {
      suggestions.push("What drift events are currently active?");
    }

    const scores = [
      { name: 'EU AI Act', score: posture.euAiActScore },
      { name: 'NIST AI RMF', score: posture.nistScore },
      { name: 'ISO 42001', score: posture.iso42001Score },
      { name: 'ISO 27001', score: posture.iso27001Score }
    ];

    scores.sort((a, b) => a.score - b.score);
    const lowest = scores[0];

    if (lowest.score < 70) {
      suggestions.push(`How can we improve our ${lowest.name} compliance score?`);
    } else {
      suggestions.push("What are our highest compliance gaps?");
    }

    suggestions.push("What third-party vendor tools are currently under review?");
    suggestions.push("What evidence do we have for Clause 7 of ISO 42001?");

    return suggestions.slice(0, 5);
  }

  static async executeToolCall(organizationId: string, userId: string, name: string, input: any) {
    logger.info(`Advisor executing tool call: ${name} with input ${JSON.stringify(input)}`);
    try {
      switch (name) {
        case 'get_eu_ai_act_status':
          return await EuAiActService.getFrameworkOverview(organizationId);
        case 'get_nist_status':
          return await NistAiRmfService.getFrameworkOverview(organizationId);
        case 'get_iso42001_status':
          return await Iso42001Service.getFrameworkOverview(organizationId);
        case 'get_iso27001_status':
          return await Iso27001Service.getFrameworkOverview(organizationId);
        case 'get_open_incidents':
          return await prisma.incidents.findMany({ where: { organizationId, status: 'unresolved' } });
        case 'get_drift_alerts':
          return await prisma.drift_alerts.findMany({ where: { organizationId, status: 'open' } });
        case 'get_vendors':
          return await prisma.vendor_ai_tools.findMany({ where: { organizationId } });
        case 'get_agents':
          return await prisma.ai_agents.findMany({ where: { organizationId } });
        case 'get_guardrails':
          return await prisma.policies.findMany({ where: { organizationId, category: 'guardrail' } });
        case 'get_policies':
          return await prisma.policies.findMany({ where: { organizationId } });
        case 'get_evidence_files':
          return await prisma.evidence_files.findMany({ where: { organizationId } });
        case 'get_fria_assessments':
          return await prisma.fria_assessments.findMany({ where: { organizationId }, include: { ai_system: true } });
        case 'get_evaluation_results':
          return await prisma.evaluation_runs.findMany({ where: { organizationId }, include: { results: true }, take: 5, orderBy: { created_at: 'desc' } });
        case 'get_compliance_scores':
          return await this.getCompliancePosture(organizationId);
        case 'get_risk_summary': {
          const [agents, policies, guardrails] = await Promise.all([
            prisma.ai_agents.count({ where: { organizationId } }),
            prisma.policies.count({ where: { organizationId } }),
            prisma.policies.count({ where: { organizationId, category: 'guardrail' } })
          ]);
          return { agents, policies, guardrails };
        }
        // Write tools
        case 'create_incident':
          return await prisma.incidents.create({
            data: {
              organizationId,
              agent_id: input.agentId || 'advisor-system',
              severity: input.severity === 'CRITICAL' ? 4 : input.severity === 'HIGH' ? 3 : input.severity === 'MEDIUM' ? 2 : 1,
              action: 'BLOCK',
              details: input.description,
              prompt_excerpt: 'Advisor trigger',
              response_excerpt: 'Advisor generated incident',
              event_metadata: { source: 'advisor', title: input.title },
              status: 'unresolved'
            }
          });
        case 'create_drift_alert':
          return await prisma.drift_alerts.create({
            data: {
              organizationId,
              agentId: input.agentId,
              type: 'ADVISOR_TRIGGERED',
              severity: 'HIGH',
              description: input.description,
              status: 'open',
              driftScore: 0.75,
              unexpectedActions: ['Advisor flagged dynamic state drift']
            }
          });
        case 'update_guardrail_status':
          return await prisma.policies.update({
            where: { id: input.guardrailId, organizationId },
            data: { enabled: input.enabled }
          });
        default:
          throw new Error(`Tool ${name} not found`);
      }
    } catch (err: any) {
      logger.error(`Advisor tool execution error [${name}]:`, err);
      return { error: err.message || 'Tool execution failed' };
    }
  }

  static async chat(organizationId: string, userId: string, messages: any[], res: any) {
    const client = this.getClient();
    if (!client) {
      res.write(`data: ${JSON.stringify({ error: 'Anthropic API key is not configured. Please add ANTHROPIC_API_KEY in the server environment.' })}\n\n`);
      res.end();
      return;
    }

    const posture = await this.getCompliancePosture(organizationId);

    const systemPrompt = `You are Sentra AI's Chief Compliance Officer and Compliance Copilot.
Your duty is to advise the organization on their compliance posture with rich insights and direct access to compliance tools.

Current Compliance Posture Summary:
- EU AI Act Compliance Score: ${posture.euAiActScore}%
- NIST AI Risk Management Framework Score: ${posture.nistScore}%
- ISO 42001 Compliance Score: ${posture.iso42001Score}%
- ISO 27001 Compliance Score: ${posture.iso27001Score}%
- Open Unresolved Incidents: ${posture.openIncidents}
- Active Model Drift Alerts: ${posture.activeDrifts}

Make sure to format all your answers in beautiful, clean markdown format. Give direct answers, cite regulations when relevant, and execute tools when the user asks for specific compliance reports or status parameters.
If you call write tools (e.g. to create incidents, create drift alerts, or update guardrails), explain what action you are suggesting.`;

    const tools: Anthropic.Tool[] = [
      {
        name: 'get_eu_ai_act_status',
        description: 'Retrieves the organization\'s overall EU AI Act article compliance audit status and scores.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_nist_status',
        description: 'Retrieves the NIST AI Risk Management Framework (RMF) category details and scores.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_iso42001_status',
        description: 'Retrieves the ISO/IEC 42001 compliance audit status and scores.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_iso27001_status',
        description: 'Retrieves the ISO/IEC 27001 compliance audit status and scores.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_open_incidents',
        description: 'Lists all open unresolved security/compliance incidents.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_drift_alerts',
        description: 'Retrieves active drift alerts for deployed AI systems.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_vendors',
        description: 'Lists all registered third-party vendor AI systems under review.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_agents',
        description: 'Lists all deployed autonomous AI agents.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_guardrails',
        description: 'Lists the active guardrail policies mapped to AI pipelines.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_policies',
        description: 'Lists all active security and AI governance policies.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_evidence_files',
        description: 'Retrieves evidence documents uploaded for compliance audits.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_fria_assessments',
        description: 'Lists completed and active Fundamental Rights Impact Assessments (FRIA).',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_evaluation_results',
        description: 'Fetches recent model evaluation outcomes (hallucination rate, fairness, safety).',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_compliance_scores',
        description: 'Fetches scores for EU AI Act, NIST AI RMF, ISO 42001, and ISO 27001.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_risk_summary',
        description: 'Retrieves summary of total agents, policies, and guardrails.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'create_incident',
        description: 'Creates a new compliance/governance incident for investigation.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the incident' },
            description: { type: 'string', description: 'Detailed description of the incident' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            agentId: { type: 'string', description: 'Optional ID of the AI agent' }
          },
          required: ['title', 'description', 'severity']
        }
      },
      {
        name: 'create_drift_alert',
        description: 'Creates a dynamic model drift alert for a deployed AI system.',
        input_schema: {
          type: 'object',
          properties: {
            agentId: { type: 'string', description: 'ID of the autonomous agent experiencing drift' },
            description: { type: 'string', description: 'Observed drift parameters or unexpected actions' }
          },
          required: ['agentId', 'description']
        }
      },
      {
        name: 'update_guardrail_status',
        description: 'Enables or disables an active guardrail policy.',
        input_schema: {
          type: 'object',
          properties: {
            guardrailId: { type: 'string', description: 'ID of the guardrail policy' },
            enabled: { type: 'boolean', description: 'True to enable, false to disable' }
          },
          required: ['guardrailId', 'enabled']
        }
      }
    ];

    try {
      // Structure messages list correctly for Anthropic API
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Call Anthropic API with streaming
      const stream = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: formattedMessages as any,
        tools: tools,
        stream: true
      });

      let currentToolCall: any = null;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          const contentBlock = chunk.content_block as any;
          if (contentBlock.type === 'tool_use') {
            currentToolCall = {
              id: contentBlock.id,
              name: contentBlock.name,
              input: ''
            };
            res.write(`data: ${JSON.stringify({ tool_start: currentToolCall.name })}\n\n`);
          }
        } else if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta as any;
          if (delta.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: delta.text })}\n\n`);
          } else if (delta.type === 'input_json_delta') {
            if (currentToolCall) {
              currentToolCall.input += delta.partial_json;
            }
          }
        } else if (chunk.type === 'content_block_stop') {
          if (currentToolCall) {
            let parsedInput = {};
            try {
              parsedInput = JSON.parse(currentToolCall.input || '{}');
            } catch (e) {}

            res.write(`data: ${JSON.stringify({ tool_confirm: { name: currentToolCall.name, input: parsedInput, id: currentToolCall.id } })}\n\n`);
            
            // Execute tool server-side immediately and supply the results back to res or client
            const toolResult = await this.executeToolCall(organizationId, userId, currentToolCall.name, parsedInput);
            res.write(`data: ${JSON.stringify({ tool_result: { name: currentToolCall.name, result: toolResult } })}\n\n`);
            
            currentToolCall = null;
          }
        }
      }

      // Store in DB history
      await prisma.advisor_conversations.create({
        data: {
          organizationId,
          userId,
          messages: messages as any
        }
      }).catch(err => logger.error('Failed to save advisor conversation:', err));

      res.end();
    } catch (error: any) {
      logger.error('Advisor Chat Stream Error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream processing failed' })}\n\n`);
      res.end();
    }
  }
}
