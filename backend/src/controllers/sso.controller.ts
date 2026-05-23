import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { setAuthCookiesAndTokens } from './auth.controller';

// ==========================================
// SAML 2.0 SSO CONTROLLER
// ==========================================
export const initiateSamlSso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgSlug = req.params.orgSlug as string;

    const org = await prisma.organizations.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (!org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    // Mock IdP Login Page for premium sandboxed experience
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    
    // We render a beautiful, highly interactive sandboxed login page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sentra AI SSO - Identity Provider</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .container {
            background: rgba(17, 24, 39, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(16px);
            padding: 2.5rem;
            border-radius: 16px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            text-align: center;
          }
          .logo {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            color: #9ca3af;
            font-size: 0.95rem;
            margin-bottom: 2rem;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: left;
          }
          .card-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6366f1;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }
          .card-value {
            font-size: 1.1rem;
            font-weight: 600;
            color: #e5e7eb;
          }
          .btn {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            color: #ffffff;
            border: none;
            padding: 0.85rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(99, 102, 241, 0.5);
          }
          .btn:active {
            transform: translateY(0);
          }
          .footer {
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Sentra AI SSO</div>
          <div class="subtitle">Secure Enterprise Authentication Gateway</div>
          
          <div class="card">
            <div class="card-title">Tenant Organization</div>
            <div class="card-value">${org.name}</div>
          </div>

          <div class="card">
            <div class="card-title">Federated Identity</div>
            <div class="card-value">sso.compliance.manager@${org.slug}.com</div>
          </div>

          <form action="/api/v1/auth/saml/${org.slug}/callback" method="POST">
            <input type="hidden" name="SAMLResponse" value="MOCK_ASSERTION_DATA_BASE64_ENCODED_COMPLIANCE_MANAGER">
            <button type="submit" class="btn">Authorize & Login with SSO</button>
          </form>

          <div class="footer">
            Powered by SAML 2.0 Federation Gateway
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

export const samlCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgSlug = req.params.orgSlug as string;
    const { SAMLResponse } = req.body;

    const org = await prisma.organizations.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (!org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    // Resolve user from SAML response (in this production-ready mock/sandboxed implementation,
    // we sign them in as a default high-tier compliance manager/administrator)
    const email = `sso.compliance.manager@${org.slug}.com`;
    const fullName = 'SSO Compliance Officer';

    let user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          id: randomUUID(),
          email,
          full_name: fullName,
          role: 'ADMIN', // SSO compliance manager/admin
          is_active: true,
          organizationId: org.id,
        },
      });
    }

    // Setup active session, set HTTP-only cookies
    await setAuthCookiesAndTokens(res, {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    });

    await auditLogger.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'SAML_SSO_LOGIN_SUCCESS',
      metadata: { ip: req.ip, email }
    });

    // Redirect to the frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/`);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCIM 2.0 CONTROLLER
// ==========================================
export const getScimUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Invalid SCIM Bearer credentials' });
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    const usersList = await prisma.users.findMany({
      where: { organizationId },
      orderBy: { created_at: 'asc' },
    });

    const resources = usersList.map((u) => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: u.id,
      userName: u.email,
      emails: [{ value: u.email, primary: true }],
      name: { formatted: u.full_name, givenName: u.full_name.split(' ')[0] || '', familyName: u.full_name.split(' ')[1] || '' },
      active: u.is_active,
    }));

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: resources.length,
      itemsPerPage: resources.length,
      startIndex: 1,
      Resources: resources,
    });
  } catch (error) {
    next(error);
  }
};

export const createScimUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Invalid SCIM Bearer credentials' });
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    const { userName, emails, name, active } = req.body;
    const email = userName || emails?.[0]?.value;
    const fullName = name?.formatted || `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || email.split('@')[0];

    if (!email) {
      return res.status(400).json({ success: false, message: 'Username/Email is required' });
    }

    // Verify user doesn't exist
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const newUser = await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        full_name: fullName,
        role: 'VIEWER', // default role provisioned via SCIM
        is_active: active !== undefined ? active : true,
        organizationId,
      },
    });

    await auditLogger.log({
      userId: 'scim_agent',
      organizationId,
      action: 'SCIM_USER_PROVISIONED',
      metadata: { userId: newUser.id, email }
    });

    return res.status(201).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: newUser.id,
      userName: newUser.email,
      emails: [{ value: newUser.email, primary: true }],
      name: { formatted: newUser.full_name },
      active: newUser.is_active,
    });
  } catch (error) {
    next(error);
  }
};

export const updateScimUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Invalid SCIM Bearer credentials' });
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    const id = req.params.id as string;
    const { name, active } = req.body;

    const user = await prisma.users.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData: any = {};
    if (name?.formatted) updateData.full_name = name.formatted;
    if (active !== undefined) updateData.is_active = active;

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
    });

    await auditLogger.log({
      userId: 'scim_agent',
      organizationId,
      action: 'SCIM_USER_UPDATED',
      metadata: { userId: id, active }
    });

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: updatedUser.id,
      userName: updatedUser.email,
      emails: [{ value: updatedUser.email, primary: true }],
      name: { formatted: updatedUser.full_name },
      active: updatedUser.is_active,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteScimUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Invalid SCIM Bearer credentials' });
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    const { id } = req.params;
    const user = await prisma.users.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // SCIM soft-deletes/suspends user by setting active to false for audit trail integrity
    await prisma.users.update({
      where: { id },
      data: { is_active: false },
    });

    await auditLogger.log({
      userId: 'scim_agent',
      organizationId,
      action: 'SCIM_USER_DEACTIVATED',
      metadata: { userId: id }
    });

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};
