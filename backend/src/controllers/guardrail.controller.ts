
import { Response, NextFunction } from 'express';
import { GuardrailService } from '../services/guardrail.service';
import logger from '../utils/logger';

export const processAIRequest = async (req: any, res: Response, next: NextFunction) => {
  const { prompt, model = 'gpt-4o' } = req.body;
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  try {
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

export const getGuardrailLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const logs = await GuardrailService.getInterceptionLogs();
    res.status(200).json({ success: true, data: logs });
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
    const overrides = await GuardrailService.getOverrides();
    res.status(200).json({ success: true, data: overrides });
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const metrics = await GuardrailService.getMetrics();
    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};
