import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { setAuthCookiesAndTokens } from './auth.controller';
import * as samlify from 'samlify';
import { encrypt, decrypt } from '../utils/encryption';

// Set schema validator as a no-op to avoid native binaries issues in deployment
samlify.setSchemaValidator({ validate: () => Promise.resolve('skipped') });

// Normalise a list of allowed email domains ("Acme.com", "@acme.com") into lowercase bare domains.
export const normalizeAllowedDomains = (input: unknown): string[] => {
  const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  return Array.from(
    new Set(
      list
        .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
        .filter((d) => d.length > 0)
    )
  );
};

const frontendLoginErrorUrl = (): string => {
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
  return `${frontendUrl}/login?error=sso_failed`;
};

// ==========================================
// SAML 2.0 SSO CONTROLLER
// ==========================================

export const updateSsoConfig = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { idpMetadataXml, attributeMapping, sso_provider, allowedEmailDomains } = req.body;
    const organizationId = req.user.organizationId;

    if (!idpMetadataXml) {
      return res.status(400).json({ success: false, message: 'IdP Metadata XML is required' });
    }

    const defaultMapping = {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    };

    // Get current org configuration to preserve the existing SCIM Bearer token if it exists
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId }
    });

    const samlMetadata = (org?.saml_metadata as any) || {};
    const existingTokenEncrypted = samlMetadata.scimBearerToken || samlMetadata.SCIM_BEARER_TOKEN;

    let plaintextToken = '';
    let encryptedToken = '';

    if (existingTokenEncrypted) {
      try {
        // Try decrypting the existing token (if stored encrypted)
        plaintextToken = decrypt(existingTokenEncrypted);
        encryptedToken = existingTokenEncrypted;
      } catch (err) {
        // Legacy plaintext token: encrypt it now and preserve the plaintext value
        plaintextToken = existingTokenEncrypted;
        encryptedToken = encrypt(plaintextToken);
      }
    } else {
      // Generate a new UUID for first-time setup
      plaintextToken = randomUUID();
      encryptedToken = encrypt(plaintextToken);
    }

    // Keep the existing allowed domains unless the admin sends a new list
    const domains = allowedEmailDomains !== undefined
      ? normalizeAllowedDomains(allowedEmailDomains)
      : normalizeAllowedDomains(samlMetadata.allowedEmailDomains);

    const updatedOrg = await prisma.organizations.update({
      where: { id: organizationId },
      data: {
        sso_enabled: true,
        sso_provider: sso_provider || 'SAML',
        saml_metadata: {
          idpMetadataXml,
          attributeMapping: attributeMapping || defaultMapping,
          allowedEmailDomains: domains,
          scimBearerToken: encryptedToken // Encrypted at rest!
        }
      }
    });

    logger.info(`[SSO-CONFIG] Updated SSO configuration for org "${organizationId}"`);
    return res.status(200).json({
      success: true,
      data: updatedOrg,
      scimBearerToken: plaintextToken // Plaintext returned to admin!
    });
  } catch (error) {
    next(error);
  }
};

export const getSamlMetadata = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const orgSlug = req.params.orgSlug as string;
    const org = await prisma.organizations.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (!org.sso_enabled || !org.saml_metadata) {
      return res.status(400).json({ success: false, message: 'SSO is not enabled or metadata is not configured' });
    }

    const samlMetadata = org.saml_metadata as any;
    if (!samlMetadata || !samlMetadata.idpMetadataXml) {
      return res.status(400).json({ success: false, message: 'IdP Metadata XML is not configured for this organization' });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const sp = samlify.ServiceProvider({
      entityID: `${backendUrl}/api/v1/saml/${orgSlug}/metadata`,
      assertionConsumerService: [
        {
          Binding: samlify.Constants.BindingNamespace.Post,
          Location: `${backendUrl}/api/v1/saml/${orgSlug}/callback`,
        },
      ],
    });

    res.header('Content-Type', 'application/xml');
    return res.status(200).send(sp.getMetadata());
  } catch (error) {
    next(error);
  }
};

export const initiateSamlSso = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
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

    const samlMetadata = org.saml_metadata as any;
    if (!samlMetadata || !samlMetadata.idpMetadataXml) {
      return res.status(400).json({ success: false, message: 'IdP Metadata XML is not configured for this organization' });
    }

    const idp = samlify.IdentityProvider({
      metadata: samlMetadata.idpMetadataXml,
    });

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const sp = samlify.ServiceProvider({
      entityID: `${backendUrl}/api/v1/saml/${orgSlug}/metadata`,
      assertionConsumerService: [
        {
          Binding: samlify.Constants.BindingNamespace.Post,
          Location: `${backendUrl}/api/v1/saml/${orgSlug}/callback`,
        },
      ],
    });

    const { context } = sp.createLoginRequest(idp, 'redirect');
    return res.redirect(context);
  } catch (error) {
    logger.error('[SAML-SSO] Failed to initiate SAML login:', error);
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?error=sso_failed`);
  }
};

export const samlCallback = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const orgSlug = req.params.orgSlug as string;
  let org: Awaited<ReturnType<typeof prisma.organizations.findUnique>> = null;

  // Record a rejected SSO login and send the browser back to the login page.
  // The browser only ever sees a generic error; the real reason goes to the audit log.
  const rejectLogin = async (reason: string, userId: string | null, metadata: Record<string, any> = {}) => {
    logger.warn(`[SAML-SSO] Login rejected for org "${orgSlug}": ${reason}`);
    // audit_logs.user_id is a foreign key to users, so we can only log when we know a real user.
    if (org && userId) {
      await auditLogger.log({
        userId,
        organizationId: org.id,
        action: 'SAML_SSO_LOGIN_REJECTED',
        severity: 'warn',
        outcome: 'failure',
        metadata: { reason, ...metadata },
      });
    }
    return res.redirect(frontendLoginErrorUrl());
  };

  try {
    org = await prisma.organizations.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (!org.sso_enabled) {
      return res.status(501).json({ success: false, message: 'SSO is not enabled for this organization' });
    }

    const samlMetadata = org.saml_metadata as any;
    if (!samlMetadata || !samlMetadata.idpMetadataXml) {
      return res.status(400).json({ success: false, message: 'IdP Metadata XML is not configured for this organization' });
    }

    const idp = samlify.IdentityProvider({
      metadata: samlMetadata.idpMetadataXml,
    });

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const sp = samlify.ServiceProvider({
      entityID: `${backendUrl}/api/v1/saml/${orgSlug}/metadata`,
      assertionConsumerService: [
        {
          Binding: samlify.Constants.BindingNamespace.Post,
          Location: `${backendUrl}/api/v1/saml/${orgSlug}/callback`,
        },
      ],
    });

    // Parse the SAML response. samlify verifies the XML signature against the IdP certificate
    // in the stored metadata and throws on an unsigned or wrongly signed response.
    // That throw lands in the catch below, so no login happens.
    const { extract } = await sp.parseLoginResponse(idp, 'post', req);

    // Extract user attributes safely
    const attributeMapping = samlMetadata.attributeMapping || {};
    const emailClaim = attributeMapping.email || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
    const nameClaim = attributeMapping.name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';

    const attributes = extract.attributes || {};
    const rawEmail = attributes[emailClaim] || attributes['email'] || extract.nameID;
    const rawName = attributes[nameClaim] || attributes['name'] || (typeof rawEmail === 'string' ? rawEmail.split('@')[0] : 'SAML User');

    const firstEmail = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    let name = Array.isArray(rawName) ? rawName[0] : rawName;

    const email = String(firstEmail || '').trim().toLowerCase();
    name = String(name || '');

    if (!email) {
      throw new Error('SAML login response did not return a valid email or NameID');
    }

    // Find the user first, so every rejection below can be tied to a real account in the audit log.
    const existingUser = await prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    // Enforce the allowed email domain for this org (when the admin has configured one).
    const allowedDomains = normalizeAllowedDomains(samlMetadata.allowedEmailDomains);
    if (allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1] || '';
      if (!allowedDomains.includes(emailDomain)) {
        return await rejectLogin('EMAIL_DOMAIN_NOT_ALLOWED', existingUser?.id ?? null, { email, emailDomain });
      }
    }

    // Cross-org protection: an account that belongs to another org must never be logged in here.
    if (existingUser && existingUser.organizationId !== org.id) {
      return await rejectLogin('ORGANIZATION_MISMATCH', existingUser.id, {
        email,
        attemptedOrganizationId: org.id,
        userOrganizationId: existingUser.organizationId,
      });
    }

    // Deactivated user protection: an inactive user must never be logged in.
    if (existingUser && existingUser.is_active === false) {
      return await rejectLogin('USER_DEACTIVATED', existingUser.id, {
        email,
        organizationId: org.id,
      });
    }

    // Upsert the user in that organization
    let user = existingUser;
    if (!user) {
      user = await prisma.users.create({
        data: {
          id: randomUUID(),
          email,
          full_name: name,
          role: 'MEMBER',
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
      organizationId: org.id,
      action: 'SAML_SSO_LOGIN_SUCCESS',
      metadata: { email, provider: org.sso_provider || 'SAML' }
    });

    // Redirect to the frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    logger.error('[SAML-SSO] SAML callback processing failed:', error);
    return res.redirect(frontendLoginErrorUrl());
  }
};


// ==========================================
// SCIM 2.0 CONTROLLER
// ==========================================
export const getScimUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return res.status(501).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '501', detail: 'SSO is not enabled for this organization' });
    }

    const whereClause: any = { organizationId };

    // Support filter ?filter=userName eq "..."
    if (req.query.filter && typeof req.query.filter === 'string') {
      const match = req.query.filter.match(/userName\s+eq\s+["']([^"']+)["']/i);
      if (match && match[1]) {
        whereClause.email = match[1];
      }
    }

    const usersList = await prisma.users.findMany({
      where: whereClause,
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

export const getScimUserById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }
    const { id } = req.params;
    const user = await prisma.users.findFirst({ where: { id, organizationId } });
    if (!user) {
      return res.status(404).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '404', detail: 'User not found' });
    }
    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      userName: user.email,
      emails: [{ value: user.email, primary: true }],
      name: { formatted: user.full_name, givenName: user.full_name.split(' ')[0] || '', familyName: user.full_name.split(' ')[1] || '' },
      active: user.is_active,
    });
  } catch (error) {
    next(error);
  }
};

export const patchScimUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }
    const { id } = req.params;
    const user = await prisma.users.findFirst({ where: { id, organizationId } });
    if (!user) {
      return res.status(404).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '404', detail: 'User not found' });
    }

    const { Operations } = req.body;
    if (!Operations || !Array.isArray(Operations)) {
      return res.status(400).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '400', detail: 'Invalid operations format' });
    }

    const updateData: any = {};
    for (const op of Operations) {
      const path = op.path;
      const value = op.value;
      const opType = String(op.op).toLowerCase();

      if (opType === 'replace' || opType === 'add') {
        if (path === 'active' || value?.active !== undefined) {
          updateData.is_active = path === 'active' ? (value === true || value === 'true') : value.active;
        }
        if (path === 'name.formatted') {
          updateData.full_name = value;
        }
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
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

export const getScimGroups = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];
    const resources: any[] = [];

    for (const roleName of rolesList) {
      const roleUsers = await prisma.users.findMany({
        where: { organizationId, role: roleName },
        select: { id: true, full_name: true }
      });

      resources.push({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        id: roleName.toLowerCase(),
        displayName: roleName,
        members: roleUsers.map((u) => ({
          value: u.id,
          display: u.full_name
        }))
      });
    }

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

export const getScimGroupById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const { id } = req.params;
    const roleName = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(roleName)) {
      return res.status(404).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '404', detail: 'Group not found' });
    }

    const roleUsers = await prisma.users.findMany({
      where: { organizationId, role: roleName },
      select: { id: true, full_name: true }
    });

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: roleName.toLowerCase(),
      displayName: roleName,
      members: roleUsers.map((u) => ({
        value: u.id,
        display: u.full_name
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const createScimGroup = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const { displayName, members } = req.body;
    const targetRole = String(displayName || '').toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return res.status(400).json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "400",
        detail: `Group '${displayName}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      });
    }

    if (members && Array.isArray(members)) {
      const userIds = members.map((m: any) => m.value);
      await prisma.users.updateMany({
        where: { id: { in: userIds }, organizationId },
        data: { role: targetRole }
      });
    }

    return res.status(201).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: targetRole.toLowerCase(),
      displayName: targetRole,
      members: members || []
    });
  } catch (error) {
    next(error);
  }
};

export const updateScimGroup = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const { id } = req.params;
    const { displayName, members } = req.body;
    const targetRole = String(displayName || '').toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return res.status(400).json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "400",
        detail: `Group '${displayName}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      });
    }

    await prisma.users.updateMany({
      where: { organizationId, role: targetRole },
      data: { role: 'VIEWER' }
    });

    if (members && Array.isArray(members)) {
      const userIds = members.map((m: any) => m.value);
      await prisma.users.updateMany({
        where: { id: { in: userIds }, organizationId },
        data: { role: targetRole }
      });
    }

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: targetRole.toLowerCase(),
      displayName: targetRole,
      members: members || []
    });
  } catch (error) {
    next(error);
  }
};

export const patchScimGroup = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const { id } = req.params;
    const targetRole = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return res.status(400).json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "400",
        detail: `Group '${id}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      });
    }

    const { Operations } = req.body;
    if (!Operations || !Array.isArray(Operations)) {
      return res.status(400).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '400', detail: 'Invalid operations format' });
    }

    for (const op of Operations) {
      const opType = String(op.op).toLowerCase();
      const value = op.value;

      if (opType === 'add') {
        if (value && Array.isArray(value)) {
          const userIds = value.map((m: any) => m.value);
          await prisma.users.updateMany({
            where: { id: { in: userIds }, organizationId },
            data: { role: targetRole }
          });
        }
      } else if (opType === 'remove') {
        if (!value) {
          await prisma.users.updateMany({
            where: { organizationId, role: targetRole },
            data: { role: 'VIEWER' }
          });
        } else if (Array.isArray(value)) {
          const userIds = value.map((m: any) => m.value);
          await prisma.users.updateMany({
            where: { id: { in: userIds }, organizationId, role: targetRole },
            data: { role: 'VIEWER' }
          });
        }
      } else if (opType === 'replace') {
        if (value && Array.isArray(value)) {
          await prisma.users.updateMany({
            where: { organizationId, role: targetRole },
            data: { role: 'VIEWER' }
          });
          const userIds = value.map((m: any) => m.value);
          await prisma.users.updateMany({
            where: { id: { in: userIds }, organizationId },
            data: { role: targetRole }
          });
        }
      }
    }

    const roleUsers = await prisma.users.findMany({
      where: { organizationId, role: targetRole },
      select: { id: true, full_name: true }
    });

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: targetRole.toLowerCase(),
      displayName: targetRole,
      members: roleUsers.map((u) => ({
        value: u.id,
        display: u.full_name
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteScimGroup = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Invalid SCIM Bearer credentials' });
    }

    const { id } = req.params;
    const targetRole = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return res.status(404).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '404', detail: 'Group not found' });
    }

    await prisma.users.updateMany({
      where: { organizationId, role: targetRole },
      data: { role: 'VIEWER' }
    });

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getServiceProviderConfig = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'SaaS tenant-specific SCIM Bearer Token authorization.',
        specUri: 'http://tools.ietf.org/html/rfc6750',
        type: 'oauthbearertoken',
        primary: true,
      },
    ],
  });
};

export const getResourceTypes = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    itemsPerPage: 2,
    startIndex: 1,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        endpoint: '/Users',
        description: 'User Account Schema',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
      },
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'Group',
        name: 'Group',
        endpoint: '/Groups',
        description: 'System Group mapped to Application Role Schema',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      },
    ],
  });
};

export const getSchemas = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    itemsPerPage: 2,
    startIndex: 1,
    Resources: [
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'Core User Schema',
        attributes: [
          { name: 'id', type: 'string', multiValued: false, required: true, caseExact: false, mutability: 'readOnly', returned: 'always', uniqueness: 'global' },
          { name: 'userName', type: 'string', multiValued: false, required: true, caseExact: false, mutability: 'readWrite', returned: 'always', uniqueness: 'server' },
          { name: 'emails', type: 'complex', multiValued: true, required: true, subAttributes: [{ name: 'value', type: 'string' }, { name: 'primary', type: 'boolean' }] },
          { name: 'name', type: 'complex', multiValued: false, subAttributes: [{ name: 'formatted', type: 'string' }] },
          { name: 'active', type: 'boolean', multiValued: false, required: false }
        ]
      },
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        name: 'Group',
        description: 'Core Group Schema',
        attributes: [
          { name: 'id', type: 'string', multiValued: false, required: true, caseExact: false, mutability: 'readOnly', returned: 'always' },
          { name: 'displayName', type: 'string', multiValued: false, required: true, caseExact: false },
          { name: 'members', type: 'complex', multiValued: true, subAttributes: [{ name: 'value', type: 'string' }, { name: 'display', type: 'string' }] }
        ]
      }
    ],
  });
};
