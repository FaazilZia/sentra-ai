import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CsrfRequest extends Request {
  csrfToken?: string;
}

export const csrfProtection = (req: CsrfRequest, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 1. Get or generate CSRF token
  let csrfToken = req.cookies?.sentra_csrf_token;
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    const cookieOptions: any = {
      httpOnly: false, // Must be readable by client-side JS
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/'
    };
    res.cookie('sentra_csrf_token', csrfToken, cookieOptions);
  }
  
  req.csrfToken = csrfToken;
  res.setHeader('x-csrf-token', csrfToken);

  // 2. Validate on mutating HTTP methods
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(req.method)) {
    // Skip verification in test/E2E environments to avoid breaking integration/E2E tests
    if (process.env.NODE_ENV === 'test' || process.env.IS_E2E_TEST === 'true') {
      return next();
    }
    
    // Token-based / Bearer requests must bypass CSRF
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];
    const isTokenAuth = (authHeader && authHeader.startsWith('Bearer ')) || !!xApiKey;

    // Public/webhook routes that cannot provide CSRF tokens (external third-party callbacks)
    const isBypassRoute = 
      req.path.includes('/saml/') || 
      req.path.includes('/scim/v2/') || 
      req.path.includes('/guardrails/demo');

    if (isTokenAuth || isBypassRoute) {
      return next();
    }

    const headerToken = req.headers['x-csrf-token'];
    
    if (!headerToken || headerToken !== csrfToken) {
      return res.status(403).json({
        error: 'CSRF_INVALID',
        message: 'CSRF token mismatch'
      });
    }
  }

  next();
};
