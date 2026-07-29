import Anthropic from '@anthropic-ai/sdk';
import prisma from '../config/db';
import logger from '../utils/logger';

export class IntakeLLMService {
  private static getClient(): Anthropic | null {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return new Anthropic({ apiKey });
  }

  static async scoreSubmission(submissionId: string, organizationId: string) {
    logger.info(`Intake LLM scoring submission ${submissionId} in org ${organizationId}`);
    try {
      const submission = await prisma.intake_submissions.findUnique({
        where: { id: submissionId }
      });

      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      const client = this.getClient();
      let llmResult: any = null;

      if (client) {
        const prompt = `Analyze this AI Agent Intake Form submission for safety, compliance, and privacy risks under the NIST AI RMF and standard security practices:
        
        Agent Name: ${submission.agentName}
        Purpose: ${submission.agentDescription}
        Data Access Scope: ${submission.useCase}
        Submitted By: ${submission.submittedBy}
        Form Data: ${JSON.stringify(submission.formData)}
        
        Provide your analysis strictly as a JSON object with the following fields:
        - risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        - risk_score: number between 0 and 100
        - risk_factors: string[] (key risk triggers found)
        - recommended_controls: string[] (how to secure this agent)
        - nist_risk_classification: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        - suggested_review_notes: string (summary review memo for compliance officers)

        Return ONLY the raw JSON block without formatting, markdown boxes, or explanation.`;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        });

        const textResponse = response.content[0].type === 'text' ? response.content[0].text : '';
        try {
          llmResult = JSON.parse(textResponse.trim().replace(/^```json/, '').replace(/```$/, ''));
        } catch (jsonErr) {
          logger.error('Failed to parse Claude JSON response, falling back:', jsonErr);
        }
      }

      // Fallback/Simulated scoring if offline or API failure
      if (!llmResult) {
        logger.warn('Using fallback intake scoring engine...');
        const containsHighRiskKeywords = /hr|salary|financial|pii|medical|health|password|auth/i.test(submission.agentDescription + submission.useCase);
        
        llmResult = {
          risk_level: containsHighRiskKeywords ? 'HIGH' : 'MEDIUM',
          risk_score: containsHighRiskKeywords ? 78 : 42,
          risk_factors: containsHighRiskKeywords 
            ? ['Processes highly sensitive PII/credential data sets', 'Lacks strict role-based access scoping in execution pathways']
            : ['Standard automation parameters mapped to model logic'],
          recommended_controls: [
            'Enforce zero-data-retention parameters on LLM gateway',
            'Route all outputs through real-time Sentraa PII scanner'
          ],
          nist_risk_classification: containsHighRiskKeywords ? 'HIGH' : 'LOW',
          suggested_review_notes: 'Automated governance overlay review is suggested before deploying this model to production environments.'
        };
      }

      // Update the intake submission with the score Json
      await prisma.intake_submissions.update({
        where: { id: submissionId },
        data: { llm_risk_score: llmResult }
      });

      // Trigger automatic automations
      const { AutomationService } = require('./automation.service');
      await AutomationService.triggerByEvent(organizationId, 'INTAKE_SCORED', {
        submissionId,
        agentName: submission.agentName,
        riskScore: llmResult.risk_score,
        riskLevel: llmResult.risk_level
      });

      return llmResult;
    } catch (err) {
      logger.error('Intake scoring failed:', err);
      throw err;
    }
  }

  static async generateSuggestedQuestions(agentDescription: string): Promise<string[]> {
    const client = this.getClient();
    
    if (client) {
      try {
        const prompt = `Based on this AI agent purpose/description: "${agentDescription}", suggest 3 additional risk/compliance intake questions that the organization should ask the deployer to ensure compliance. Return them as a JSON string array only, like: ["Question 1", "Question 2", "Question 3"].`;
        
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });

        const textResponse = response.content[0].type === 'text' ? response.content[0].text : '';
        return JSON.parse(textResponse.trim().replace(/^```json/, '').replace(/```$/, ''));
      } catch (err) {
        logger.error('Failed to get suggestions from Claude:', err);
      }
    }

    // Return robust static fallback suggestions
    return [
      "Will this agent process credentials, access tokens, or session secrets?",
      "Does this agent integrate with third-party webhooks or external API endpoints?",
      "Is there a manual approval override step before the agent completes critical database mutations?"
    ];
  }
}
