import { Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const postChat = async (req: any, res: Response, next: NextFunction) => {
  try {
    const message = String(req.body?.message || '').trim();

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are Sentra Copilot, an assistant for AI governance, compliance, and security operations. Answer clearly and concisely.',
              },
              { role: 'user', content: message },
            ],
            max_tokens: 600,
          }),
        });

        if (r.ok) {
          const data = (await r.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          if (text) {
            return res.status(200).json({ success: true, data: { response: text } });
          }
        } else {
          const errText = await r.text();
          logger.warn('OpenAI chat non-OK response', { status: r.status, errText });
        }
      } catch (e) {
        logger.warn('OpenAI chat request failed', e);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        response:
          'I can help with incidents, policies, and consent workflows. This environment is running without OPENAI_API_KEY, so replies are limited. Configure OPENAI_API_KEY on the server for full Copilot answers. In the meantime, check the Security Feed for unresolved incidents and the Governance page for active policies.',
      },
    });
  } catch (error) {
    next(error);
  }
};
