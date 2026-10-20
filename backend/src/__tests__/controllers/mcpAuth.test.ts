import { McpController } from '../../controllers/mcp.controller';
import { McpAgentKeyService } from '../../services/mcpAgentKey.service';

describe('MCP Authentication (tools/list & tools/call)', () => {
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
  });

  describe('tools/list', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const mockReq: any = {
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        },
        headers: {},
      };

      await McpController.handleJsonRpc(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid agent key',
        },
        id: 1,
      });
    });

    it('returns HTTP 401 when Bearer key is invalid or unknown', async () => {
      jest.spyOn(McpAgentKeyService, 'authenticateAgentKey').mockRejectedValueOnce(new Error('Unauthorized'));

      const mockReq: any = {
        body: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        },
        headers: {
          authorization: 'Bearer sk-mcp-invalid-key-1234567890abcdef',
        },
      };

      await McpController.handleJsonRpc(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid agent key',
        },
        id: 2,
      });
    });

    it('returns HTTP 200 with tools list when a valid Bearer key is provided', async () => {
      jest.spyOn(McpAgentKeyService, 'authenticateAgentKey').mockResolvedValueOnce({
        organizationId: 'org-test',
        agentKeyId: 'key-123',
        allowedTools: [],
        blockedTools: [],
      });

      const mockReq: any = {
        body: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list',
        },
        headers: {
          authorization: 'Bearer sk-mcp-valid-key-1234567890abcdef',
        },
      };

      await McpController.handleJsonRpc(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: '2.0',
          id: 3,
          result: expect.objectContaining({
            tools: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('tools/call', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const mockReq: any = {
        body: {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'sentra.checkAction',
            arguments: { action: 'read database' },
          },
        },
        headers: {},
      };

      await McpController.handleJsonRpc(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid agent key',
        },
        id: 4,
      });
    });

    it('returns HTTP 401 when Bearer key is invalid or unknown', async () => {
      jest.spyOn(McpAgentKeyService, 'authenticateAgentKey').mockRejectedValueOnce(new Error('Unauthorized'));

      const mockReq: any = {
        body: {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'sentra.checkAction',
            arguments: { action: 'read database' },
          },
        },
        headers: {
          authorization: 'Bearer sk-mcp-bad-key',
        },
      };

      await McpController.handleJsonRpc(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid agent key',
        },
        id: 5,
      });
    });
  });
});
