import { Response } from 'express';
import { GuardrailService } from '../services/guardrail.service';
import { EventTriggerService } from '../services/eventTrigger.service';
import { alertService } from '../services/alert.service';
import prisma from '../config/db';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';
import { ChangeHistoryService } from '../services/changeHistory.service';
import { encrypt } from '../utils/encryption';
import { io } from '../server';

export const processAIRequest = asyncHandler(async (req: any, res: Response) => {
  const { prompt, model = 'gpt-4o' } = req.body;
  const userId = req.user.id;
  const organizationId = getOrgId(req);

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
    const log = await GuardrailService.logInterception({
      user_id: userId,
      organizationId: organizationId,
      input_text: prompt,
      decision: 'BLOCK',
      confidence: inputResult.confidence,
      reason: inputResult.reason,
      policy_triggered: inputResult.policy_triggered
    });

    // Emit real-time socket event so the LiveBlockFeed picks it up
    if (io) {
      io.to(`company_${organizationId}`).emit('activity_log', {
        id: log?.id || require('crypto').randomUUID(),
        organizationId,
        timestamp: new Date().toISOString(),
        decision: 'BLOCK',
        risk: 'high',
        reason: inputResult.reason,
        compliance: [],
        ai_summary: `Guardrail blocked: ${inputResult.policy_triggered || 'adversarial pattern'}`,
        metadata: {
          agent: 'AI System',
          action: prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt
        }
      });
    }

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
  let aiResponse = `This is a simulated AI response for guardrail pipeline testing.`;

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
    metadata: { 
      original_prompt: encrypt(prompt), 
      original_output: encrypt(aiResponse) 
    }
  });

  return sendSuccess(res, {
    input: inputResult.processedText,
    output: outputResult.processedText,
    decision: outputResult.decision,
    confidence: outputResult.confidence,
    reason: outputResult.reason,
    policy_triggered: outputResult.policy_triggered
  });
});

export const processDemoRequest = asyncHandler(async (req: any, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) {
    return sendError(res, 400, 'Prompt is required');
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
      return sendSuccess(res, {
        status: 'blocked',
        reason: inputResult.reason || 'Prompt Injection Detected',
        explanation: 'This input tried to override system instructions and manipulate the AI.',
        risk_score: 95
      });
    }

    return sendSuccess(res, {
      status: 'allowed',
      reason: 'Safe Prompt',
      explanation: 'This input does not contain harmful or manipulative patterns.',
      risk_score: 10
    });

  } catch (error) {
    logger.error('Demo guardrail processing error:', error);
    return res.status(500).json({ success: false, status: 'error', reason: 'Internal testing error' });
  }
});

export const getGuardrailLogs = asyncHandler(async (req: any, res: Response) => {
  const { decision } = req.query;
  const { page, limit } = parsePagination(req.query, 20, 200);
  const organizationId = getOrgId(req);
  const logs = await GuardrailService.getInterceptionLogs(
    page,
    limit,
    { organizationId, decision: decision as string }
  );
  return sendSuccess(res, logs);
});

export const exportGuardrailLogs = asyncHandler(async (req: any, res: Response) => {
  const { format = 'csv', decision } = req.query;
  const organizationId = getOrgId(req);
  
  // Fetch all logs for export (up to 1000 for safety in MVP)
  const result = await GuardrailService.getInterceptionLogs(1, 1000, {
    organizationId,
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
      `"${(log.reason || '').replaceAll(/"/g, '""')}"`,
      `"${log.input_text.replaceAll(/"/g, '""').replaceAll(/\n/g, ' ')}"`,
      `"${(log.output_text || '').replaceAll(/"/g, '""').replaceAll(/\n/g, ' ')}"`
    ].join(','))
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
  return res.status(200).send(csvRows.join('\n'));
});

export const postRequestOverride = asyncHandler(async (req: any, res: Response) => {
  const { logId, reason } = req.body;
  const userId = req.user.id;
  const organizationId = getOrgId(req);
  const override = await GuardrailService.requestOverride(logId, userId, reason, organizationId);

  await ChangeHistoryService.logChange(
    organizationId,
    'guardrail',
    logId,
    req.user.id,
    'created',
    null,
    override,
    `Requested guardrail override: ${reason}`
  );

  return sendSuccess(res, override);
});

export const postApproveOverride = asyncHandler(async (req: any, res: Response) => {
  const { overrideId, status } = req.body;
  const userId = req.user.id;
  const organizationId = getOrgId(req);
  const override = await GuardrailService.approveOverride(overrideId, userId, status, organizationId);

  await ChangeHistoryService.logChange(
    organizationId,
    'guardrail',
    override.log_id || overrideId,
    req.user.id,
    'status_changed',
    { status: 'pending' },
    override,
    `Guardrail override request was ${status}`
  );

  return sendSuccess(res, override);
});

export const getOverrides = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const overrides = await GuardrailService.getOverrides(organizationId);
  return sendSuccess(res, overrides);
});

export const getMetrics = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const metrics = await GuardrailService.getMetrics(organizationId);
  return sendSuccess(res, metrics);
});

export const checkAction = asyncHandler(async (req: any, res: Response) => {
  const { agent, action, metadata = {} } = req.body;
  const userId = req.user.id;
  const organizationId = getOrgId(req);

  if (!agent || !action) {
    return sendError(res, 400, 'Missing agent or action in request');
  }

  // Basic context string for evaluation
  const context = `Agent: ${agent} - Action: ${action} - Metadata: ${JSON.stringify(metadata)}`;
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

  if (result.decision === 'BLOCK') {
    logger.info(`[GOVERNANCE] Action blocked for organization ${organizationId}. Triggering alert notification...`);
    // Fire-and-forget to avoid blocking the API response
    try {
      alertService.notify(organizationId, result, agent, action);
    } catch (alertError) {
      logger.error(`[ALERTS] Failed to dispatch alert for block decision: ${alertError instanceof Error ? alertError.message : String(alertError)}`);
    }
  }

  return sendSuccess(res, {
    decision: result.decision,
    reason: result.reason
  });
});

