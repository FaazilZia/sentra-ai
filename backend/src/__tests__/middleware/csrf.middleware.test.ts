import { csrfProtection } from '../../middleware/csrf.middleware';

describe('CSRF Protection Middleware (Bearer vs Cookie Sessions)', () => {
  const originalEnv = process.env.NODE_ENV;
  let mockRes: any;
  let nextFn: jest.Mock;

  beforeEach(() => {
    // Set to production so CSRF validation is actively enforced
    process.env.NODE_ENV = 'production';
    process.env.IS_E2E_TEST = 'false';

    nextFn = jest.fn();
    mockRes = {
      cookie: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('bypasses CSRF when request has a valid Bearer token (API / MCP clients)', () => {
    const mockReq: any = {
      method: 'POST',
      path: '/api/v1/mcp/proxy',
      cookies: {},
      headers: {
        authorization: 'Bearer sk-mcp-live-test-key-12345',
      },
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('bypasses CSRF when request has an x-api-key header', () => {
    const mockReq: any = {
      method: 'POST',
      path: '/api/v1/mcp/proxy',
      cookies: {},
      headers: {
        'x-api-key': 'sentra-key-12345',
      },
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('rejects cookie session hitting /api/v1/mcp/proxy without Bearer token and without x-csrf-token header', () => {
    const mockReq: any = {
      method: 'POST',
      path: '/api/v1/mcp/proxy',
      cookies: {
        sentra_csrf_token: 'existing-browser-csrf-token-1234',
        session_id: 'browser-session-987',
      },
      headers: {
        // No authorization header
      },
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'CSRF_INVALID',
      message: 'CSRF token mismatch',
    });
  });

  it('rejects cookie session hitting /api/v1/mcp/proxy with mismatched x-csrf-token header', () => {
    const mockReq: any = {
      method: 'POST',
      path: '/api/v1/mcp/proxy',
      cookies: {
        sentra_csrf_token: 'valid-cookie-token',
      },
      headers: {
        'x-csrf-token': 'wrong-attacker-token',
      },
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'CSRF_INVALID',
      message: 'CSRF token mismatch',
    });
  });

  it('allows cookie session hitting /api/v1/mcp/proxy when x-csrf-token matches cookie token', () => {
    const validToken = 'valid-matched-csrf-token';
    const mockReq: any = {
      method: 'POST',
      path: '/api/v1/mcp/proxy',
      cookies: {
        sentra_csrf_token: validToken,
      },
      headers: {
        'x-csrf-token': validToken,
      },
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('allows non-mutating GET requests through without CSRF validation', () => {
    const mockReq: any = {
      method: 'GET',
      path: '/api/v1/mcp/proxy',
      cookies: {
        sentra_csrf_token: 'token-abc',
      },
      headers: {},
    };

    csrfProtection(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
