import { Request, Response, NextFunction } from 'express';
import { GuardrailService } from '../services/guardrail.service';
import { EventTriggerService } from '../services/eventTrigger.service';
import prisma from '../config/db';
import logger from '../utils/logger';

export const processAIRequest = async (req: any, res: Response, next: NextFunction) => {
  const { prompt, model = 'gpt-4o' } = req.body;
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  try {
    // 0. Data Residency Check
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { data_region: true }
    });

    const requestRegion = req.headers['x-sentra-region'] || 'US';
    if (org && org.data_region !== requestRegion) {
      logger.warn(`Data Residency Violation: Org ${organizationId} (Region: ${org.data_region}) accessed from ${requestRegion}`);
      // For MVP, we log a warning but allow (configurable in real logic)
    }

    // 1. Pre-AI Check (Input)
    const inputResult = await GuardrailService.evaluateInput(prompt);

    if (inputResult.decision === 'BLOCK') {
      await GuardrailService.logInterception({
        user_id: userId,
        organizationId: organizationId,
        input_text: prompt,
        decision: 'BLOCK',
        confidence: inputResult.confidence,
        reason: inputResult.reason,
        policy_triggered: inputResult.policy_triggered
      });

      // Trigger the Alerts Engine in background (fire and forget)
      EventTriggerService.evaluateThresholds(organizationId).catch(err => {
        logger.error('Failed to trigger alert evaluation', err);
      });

      return res.status(403).json({
        success: false,
        decision: 'BLOCK',
        message: 'Request blocked by compliance guardrails.',
        reason: inputResult.reason
      });
    }

    // 2. Mock AI Call (In a real system, call OpenAI/Anthropic here)
    // We simulate an AI response that might leak sensitive data to test post-AI check
    let aiResponse = `Hello! I can help you with that. The user's email is john.doe@secret.com and his medical diagnosis is hypertension.`;

    if (prompt.toLowerCase().includes('hello')) {
      aiResponse = `Hi there! How can I assist you today?`;
    }

    // 3. Post-AI Check (Output)
    const outputResult = await GuardrailService.evaluateOutput(aiResponse);

    // 4. Log the final decision
    await GuardrailService.logInterception({
      user_id: userId,
      organizationId: organizationId,
      input_text: inputResult.processedText,
      output_text: outputResult.processedText,
      decision: outputResult.decision,
      confidence: outputResult.confidence,
      reason: outputResult.reason,
      policy_triggered: outputResult.policy_triggered,
      metadata: { original_prompt: prompt, original_output: aiResponse }
    });

    res.status(200).json({
      success: true,
      input: inputResult.processedText,
      output: outputResult.processedText,
      decision: outputResult.decision,
      confidence: outputResult.confidence,
      reason: outputResult.reason,
      policy_triggered: outputResult.policy_triggered
    });

  } catch (error) {
    logger.error('Guardrail processing error:', error);
    next(error);
  }
};

export const processDemoRequest = async (req: any, res: Response, next: NextFunction) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  try {
    // Optional Authentication for Demo (Syncs to User Ledger if logged in)
    let organizationId = 'DEMO_ORG';
    let userId = 'DEMO_USER';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { verifyAccessToken } = require('../utils/jwt');
        const decoded = verifyAccessToken(token);
        if (decoded) {
          organizationId = decoded.organizationId;
          userId = decoded.id;
        }
      } catch (e) {
        // Silently fail auth for demo, fall back to anonymous
      }
    }

    // 1. Pre-AI Check (Input) using existing engine
    const inputResult = await GuardrailService.evaluateInput(prompt);

    // 2. Log if it's a real user or if it's a block
    if (organizationId !== 'DEMO_ORG' || inputResult.decision === 'BLOCK') {
      await GuardrailService.logInterception({
        user_id: userId,
        organizationId: organizationId,
        input_text: prompt,
        decision: inputResult.decision,
        confidence: inputResult.confidence,
        reason: inputResult.reason,
        policy_triggered: inputResult.policy_triggered,
        metadata: { source: 'demo_page' }
      });

      if (inputResult.decision === 'BLOCK' && organizationId !== 'DEMO_ORG') {
        EventTriggerService.evaluateThresholds(organizationId).catch(err => 
          logger.error('Failed demo alert evaluation', err)
        );
      }
    }

    if (inputResult.decision === 'BLOCK') {
      return res.status(200).json({
        success: true,
        status: 'blocked',
        reason: inputResult.reason || 'Prompt Injection Detected',
        explanation: 'This input tried to override system instructions and manipulate the AI.',
        risk_score: 95
      });
    }

    return res.status(200).json({
      success: true,
      status: 'allowed',
      reason: 'Safe Prompt',
      explanation: 'This input does not contain harmful or manipulative patterns.',
      risk_score: 10
    });

  } catch (error) {
    logger.error('Demo guardrail processing error:', error);
    res.status(500).json({ success: false, status: 'error', reason: 'Internal testing error' });
  }
};

export const getGuardrailLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page, limit, decision } = req.query;
    const logs = await GuardrailService.getInterceptionLogs(
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20,
      { organizationId: req.user.organizationId, decision: decision as string }
    );
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const exportGuardrailLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { format = 'csv', decision } = req.query;
    
    // Fetch all logs for export (up to 1000 for safety in MVP)
    const result = await GuardrailService.getInterceptionLogs(1, 1000, {
      organizationId: req.user.organizationId,
      decision: decision as string
    });
    
    const logs = result.data;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      return res.send(JSON.stringify(logs, null, 2));
    }

    // Default to CSV
    const csvRows = [
      ['ID', 'Timestamp', 'Decision', 'Policy', 'Reason', 'Input Text', 'Output Text'].join(','),
      ...logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.decision,
        `"${log.policy_triggered || 'None'}"`,
        `"${(log.reason || '').replace(/"/g, '""')}"`,
        `"${log.input_text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(log.output_text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.status(200).send(csvRows.join('\n'));
  } catch (error) {
    next(error);
  }
};

export const postRequestOverride = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { logId, reason } = req.body;
    const override = await GuardrailService.requestOverride(logId, req.user.id, reason);
    res.status(200).json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
};

export const postApproveOverride = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { overrideId, status } = req.body;
    const override = await GuardrailService.approveOverride(overrideId, req.user.id, status);
    res.status(200).json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
};

export const getOverrides = async (req: any, res: Response, next: NextFunction) => {
  try {
    const overrides = await GuardrailService.getOverrides(req.user.organizationId);
    res.status(200).json({ success: true, data: overrides });
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const metrics = await GuardrailService.getMetrics(req.user.organizationId);
    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};
export const checkAction = async (req: any, res: Response, next: NextFunction) => {
  const { agent, action, metadata = {} } = req.body;
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  try {
    if (!agent || !action) {
      return res.status(400).json({ success: false, message: 'Missing agent or action in request' });
    }

    // Basic context string for evaluation
    const context = `Agent: ${agent} | Action: ${action} | Metadata: ${JSON.stringify(metadata)}`;
    const result = await GuardrailService.evaluateInput(context);

    await GuardrailService.logInterception({
      user_id: userId,
      organizationId: organizationId,
      input_text: context,
      decision: result.decision,
      confidence: result.confidence,
      reason: result.reason,
      policy_triggered: result.policy_triggered,
      metadata: { agent, action, ...metadata }
    });

    res.status(200).json({
      success: true,
      decision: result.decision,
      reason: result.reason
    });
  } catch (error) {
    logger.error('Check action error:', error);
    next(error);
  }
};
