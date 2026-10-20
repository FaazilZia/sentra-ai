import { Router, Request, Response } from 'express';
import { McpController } from '../controllers/mcp.controller';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/mcp/proxy
 * Route JSON-RPC 2.0 requests to the MCP controller
 */
router.post('/proxy', (req: Request, res: Response) => McpController.handleJsonRpc(req, res));

/**
 * GET /api/v1/mcp/proxy
 * Server-Sent Events (SSE) stream keep-alive endpoint
 */
router.get('/proxy', (req: Request, res: Response) => {
  // 1. Establish SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  // 2. Send initial handshake comment
  res.write(': ok\n\n');
  logger.info('[MCP-SSE] Persistent SSE connection opened');

  // 3. Keep-alive ping interval (every 30 seconds)
  const pingInterval = setInterval(() => {
    try {
      res.write(': ok\n\n');
    } catch (err) {
      logger.error('[MCP-SSE] Error writing ping, closing interval:', err);
      clearInterval(pingInterval);
    }
  }, 30000);

  // 4. Handle client disconnection
  req.on('close', () => {
    clearInterval(pingInterval);
    logger.info('[MCP-SSE] Persistent SSE connection closed by client');
    res.end();
  });
});

export default router;
