import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import crypto, { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { setAuthCookiesAndTokens } from './auth.controller';
import * as samlify from 'samlify';
import { encrypt, decrypt } from '../utils/encryption';
import { getRedisClient } from '../config/redis';

// Set schema validator as a no-op to avoid native binaries issues in deployment
samlify.setSchemaValidator({ validate: () => Promise.resolve('skipped') });

export const OKTA_ATTRIBUTE_PRESET = {
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  name: 'name',
  role: 'role',
  groups: 'groups',
};

export const STANDARD_ATTRIBUTE_PRESET = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
  name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  displayName: 'http://schemas.microsoft.com/identity/claims/displayname',
  role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  groups: 'http://schemas.xmlsoap.org/claims/Group',
};

export const ENTRA_ATTRIBUTE_PRESET = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
  name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  displayName: 'http://schemas.microsoft.com/identity/claims/displayname',
  role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
};

/**
 * Exact documented SAML group names mapped to Sentraa system roles.
 * Loose substring matching (e.g. includes 'ADMINISTRATOR', endsWith '_ADMIN', endsWith ':ADMIN')
 * is prohibited to eliminate privilege escalation risks and prefix collisions.
 */
export const DOCUMENTED_SAML_ROLE_MAP: Record<string, 'ADMIN' | 'ENGINEER' | 'AUDITOR' | 'MEMBER' | 'VIEWER'> = {
  ADMIN: 'ADMIN',
  SENTRA_ADMIN: 'ADMIN',
  ENGINEER: 'ENGINEER',
  SENTRA_ENGINEER: 'ENGINEER',
  AUDITOR: 'AUDITOR',
  SENTRA_AUDITOR: 'AUDITOR',
  MEMBER: 'MEMBER',
  SENTRA_MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
  SENTRA_VIEWER: 'VIEWER',
};

/**
 * Maps raw SAML role or group attributes to known system roles.
 * Security rules:
 * - Allowed roles: ADMIN, ENGINEER, AUDITOR, MEMBER, VIEWER.
 * - Matching is strictly exact against DOCUMENTED_SAML_ROLE_MAP (case-insensitive).
 * - Precedence: ADMIN > ENGINEER > AUDITOR > MEMBER > VIEWER.
 * - Missing or unrecognized roles default to VIEWER.
 * - Privilege escalation guard: SUPER_ADMIN is NEVER granted via SAML; demoted to VIEWER.
 */
export const mapSamlRole = (rawRole: unknown): string => {
  if (!rawRole) return 'VIEWER';

  const candidates: string[] = Array.isArray(rawRole)
    ? rawRole.map((r) => String(r).trim().toUpperCase())
    : [String(rawRole).trim().toUpperCase()];

  // Security Escalation Guard: NEVER allow a SAML assertion to grant SUPER_ADMIN.
  if (candidates.some((c) => c === 'SUPER_ADMIN' || c === 'SUPERADMIN' || c.includes('SUPER_ADMIN') || c.includes('SUPERADMIN'))) {
    logger.warn('[SAML-SSO] Attempted privilege escalation to SUPER_ADMIN via SAML assertion. Demoting to VIEWER.');
    return 'VIEWER';
  }

  // Precedence: ADMIN > ENGINEER > AUDITOR > MEMBER > VIEWER
  const precedence: ('ADMIN' | 'ENGINEER' | 'AUDITOR' | 'MEMBER' | 'VIEWER')[] = [
    'ADMIN',
    'ENGINEER',
    'AUDITOR',
    'MEMBER',
    'VIEWER',
  ];

  for (const role of precedence) {
    if (candidates.some((c) => DOCUMENTED_SAML_ROLE_MAP[c] === role)) {
      return role;
    }
  }

  return 'VIEWER';
};

/**
 * Revokes all active refresh tokens, sessions, and sets a Redis blacklist flag for a user.
 * Ensures a deactivated user loses active session access immediately.
 */
export const revokeUserSessions = async (userId: string): Promise<void> => {
  try {
    // 1. Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    }).catch((err) => {
      logger.warn(`[REVOKE-SESSIONS] Failed to revoke refresh tokens for user ${userId}:`, err);
    });

    // 2. Remove active login sessions
    await prisma.login_sessions.deleteMany({
      where: { userId },
    }).catch((err) => {
      logger.warn(`[REVOKE-SESSIONS] Failed to delete login sessions for user ${userId}:`, err);
    });

    // 3. Mark user blacklisted in Redis for immediate rejection in auth middleware
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(`blacklist:user:${userId}`, '1', 'EX', 86400); // 24 hours
      } catch (redisErr) {
        logger.warn(`[REVOKE-SESSIONS] Failed to write user blacklist in Redis for user ${userId}:`, redisErr);
      }
    }
  } catch (error) {
    logger.error(`[REVOKE-SESSIONS] Error revoking sessions for user ${userId}:`, error);
  }
};

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
      name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      displayName: 'http://schemas.microsoft.com/identity/claims/displayname',
      role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
      groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
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

    // If Okta or Entra provider is chosen without custom mapping, use corresponding preset
    const providerLower = String(sso_provider || '').toLowerCase();
    const chosenMapping = attributeMapping || (
      providerLower === 'okta'
        ? OKTA_ATTRIBUTE_PRESET
        : providerLower.includes('entra') || providerLower.includes('azure')
          ? ENTRA_ATTRIBUTE_PRESET
          : (samlMetadata.attributeMapping || defaultMapping)
    );

    const updatedOrg = await prisma.organizations.update({
      where: { id: organizationId },
      data: {
        sso_enabled: true,
        sso_provider: sso_provider || 'SAML',
        saml_metadata: {
          idpMetadataXml,
          attributeMapping: chosenMapping,
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

/**
 * Validates SAML IdP metadata XML, X.509 signing certificate expiration,
 * SingleSignOnService redirect URL, and required attribute mappings.
 * Strictly avoids leaking any certificates private keys, SCIM tokens, or secrets.
 */
export const testSsoConnection = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  try {
    const organizationId = req.user.organizationId;
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const { idpMetadataXml, attributeMapping } = req.body;
    const xmlToTest = idpMetadataXml?.trim() || (org.saml_metadata as any)?.idpMetadataXml?.trim();

    if (!xmlToTest) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'No IdP Metadata XML provided or configured to test'
      });
    }

    const checks: Array<{ name: string; passed: boolean; message: string }> = [];
    let entityId: string | null = null;
    let ssoUrl: string | null = null;
    let certValid = false;
    let certExpiresAt: string | null = null;
    let certDaysRemaining: number | null = null;

    // Check 1: XML Syntax & SAML EntityDescriptor
    if (xmlToTest.includes('EntityDescriptor') && xmlToTest.includes('IDPSSODescriptor')) {
      const entityIdMatch = xmlToTest.match(/entityID=["']([^"']+)["']/i);
      entityId = entityIdMatch ? entityIdMatch[1] : null;

      checks.push({
        name: 'Metadata XML Structure',
        passed: true,
        message: `Valid SAML 2.0 metadata${entityId ? ` (Entity ID: ${entityId})` : ''}`,
      });
    } else {
      checks.push({
        name: 'Metadata XML Structure',
        passed: false,
        message: 'Metadata XML must contain <EntityDescriptor> and <IDPSSODescriptor>',
      });
    }

    // Check 2: SingleSignOnService URL
    const ssoUrlMatch = xmlToTest.match(/SingleSignOnService[^>]*Location=["']([^"']+)["']/i);
    if (ssoUrlMatch && ssoUrlMatch[1]) {
      ssoUrl = ssoUrlMatch[1];
      checks.push({
        name: 'SingleSignOnService Endpoint',
        passed: true,
        message: `Found SSO endpoint: ${ssoUrl}`,
      });
    } else {
      checks.push({
        name: 'SingleSignOnService Endpoint',
        passed: false,
        message: 'No SingleSignOnService Location found in metadata XML',
      });
    }

    // Check 3: Certificate validity & expiration
    try {
      const certMatch = xmlToTest.match(/<(?:\w+:)?X509Certificate>([\s\S]*?)<\/(?:\w+:)?X509Certificate>/i);
      if (!certMatch || !certMatch[1]) {
        throw new Error('No X509Certificate found in metadata XML');
      }

      const rawCert = certMatch[1].replace(/\s+/g, '');
      const pem = `-----BEGIN CERTIFICATE-----\n${rawCert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;

      const x509 = new crypto.X509Certificate(pem);
      const validFrom = new Date(x509.validFrom);
      const validTo = new Date(x509.validTo);
      const now = new Date();

      certExpiresAt = validTo.toISOString();
      const diffMs = validTo.getTime() - now.getTime();
      certDaysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (now < validFrom) {
        checks.push({
          name: 'Signing Certificate',
          passed: false,
          message: `Certificate is not valid yet (valid from: ${validFrom.toLocaleDateString()})`,
        });
      } else if (now > validTo) {
        checks.push({
          name: 'Signing Certificate',
          passed: false,
          message: `Certificate has EXPIRED on ${validTo.toLocaleDateString()}`,
        });
      } else {
        certValid = true;
        checks.push({
          name: 'Signing Certificate',
          passed: true,
          message: `Valid certificate (expires in ${certDaysRemaining} days on ${validTo.toLocaleDateString()})`,
        });
      }
    } catch (certErr: any) {
      checks.push({
        name: 'Signing Certificate',
        passed: false,
        message: `Certificate parsing failed: ${certErr.message}`,
      });
    }

    // Check 4: Required Attribute Mapping
    const mapping = attributeMapping || (org.saml_metadata as any)?.attributeMapping || (
      org.sso_provider === 'Okta' ? OKTA_ATTRIBUTE_PRESET : STANDARD_ATTRIBUTE_PRESET
    );
    if (mapping && mapping.email && typeof mapping.email === 'string' && mapping.email.trim().length > 0) {
      checks.push({
        name: 'Required Attributes',
        passed: true,
        message: `Email mapped to "${mapping.email}". First name: "${mapping.firstName || 'not set'}", Last name: "${mapping.lastName || 'not set'}", Role/Group: "${mapping.role || mapping.groups || 'not set'}"`,
      });
    } else {
      checks.push({
        name: 'Required Attributes',
        passed: false,
        message: 'Email attribute mapping is required and cannot be empty',
      });
    }

    const allPassed = checks.every((c) => c.passed);

    return res.status(200).json({
      success: true,
      valid: allPassed,
      details: {
        entityId,
        ssoUrl,
        certValid,
        certExpiresAt,
        certDaysRemaining,
        attributeMapping: mapping,
        checks,
      },
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
    const displayNameClaim = attributeMapping.displayName || 'http://schemas.microsoft.com/identity/claims/displayname';
    const firstNameClaim = attributeMapping.firstName || 'firstName';
    const lastNameClaim = attributeMapping.lastName || 'lastName';
    const roleClaim = attributeMapping.role || 'role';
    const groupsClaim = attributeMapping.groups || 'groups';

    const attributes = extract.attributes || {};

    // NameID format extraction: extract.nameID may be string or object with { value, _ }
    const extractNameIdString = (nameId: any): string => {
      if (!nameId) return '';
      if (typeof nameId === 'string') return nameId;
      if (typeof nameId === 'object') {
        return nameId.value || nameId._ || nameId.innerHtml || '';
      }
      return String(nameId);
    };

    const nameIdVal = extractNameIdString(extract.nameID);

    const rawEmail = attributes[emailClaim]
      || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      || attributes['email']
      || attributes['mail']
      || attributes['userPrincipalName']
      || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn']
      || nameIdVal;

    // Resolve user full name from firstName + lastName if available, then displayName, then nameClaim, then email prefix
    const rawFirstName = attributes[firstNameClaim]
      || attributes['firstName']
      || attributes['givenName']
      || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
    const rawLastName = attributes[lastNameClaim]
      || attributes['lastName']
      || attributes['familyName']
      || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];

    const firstStr = Array.isArray(rawFirstName) ? rawFirstName[0] : rawFirstName;
    const lastStr = Array.isArray(rawLastName) ? rawLastName[0] : rawLastName;

    let resolvedName = '';
    if (firstStr || lastStr) {
      resolvedName = `${firstStr || ''} ${lastStr || ''}`.trim();
    }
    if (!resolvedName) {
      const rawName = attributes[displayNameClaim]
        || attributes['http://schemas.microsoft.com/identity/claims/displayname']
        || attributes['displayName']
        || attributes['displayname']
        || attributes[nameClaim]
        || attributes['name']
        || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
      const rawNameVal = Array.isArray(rawName) ? rawName[0] : rawName;
      resolvedName = typeof rawNameVal === 'string' ? rawNameVal.trim() : '';
    }
    if (!resolvedName && typeof rawEmail === 'string') {
      resolvedName = rawEmail.split('@')[0];
    }
    const name = String(resolvedName || 'SAML User').trim();

    // Map system role from role / groups claims
    // Collect all candidate role and group values from Entra / SAML attributes
    const candidateRoleValues: string[] = [];
    const pushCandidates = (val: unknown) => {
      if (val === undefined || val === null || val === '') return;
      if (Array.isArray(val)) {
        val.forEach((v) => { if (v !== undefined && v !== null && v !== '') candidateRoleValues.push(String(v)); });
      } else {
        candidateRoleValues.push(String(val));
      }
    };

    pushCandidates(attributes[roleClaim]);
    pushCandidates(attributes[groupsClaim]);
    pushCandidates(attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
    pushCandidates(attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']);
    pushCandidates(attributes['http://schemas.xmlsoap.org/claims/Group']);
    pushCandidates(attributes['role']);
    pushCandidates(attributes['groups']);

    const mappedRole = mapSamlRole(candidateRoleValues.length > 0 ? candidateRoleValues : undefined);

    const firstEmail = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const email = String(firstEmail || '').trim().toLowerCase();

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

    // Validate existing user account constraints (cross-org isolation & deactivation)
    if (existingUser) {
      if (existingUser.organizationId !== org.id) {
        return await rejectLogin('ORGANIZATION_MISMATCH', existingUser.id, {
          email,
          attemptedOrganizationId: org.id,
          userOrganizationId: existingUser.organizationId,
        });
      }

      if (existingUser.is_active === false) {
        return await rejectLogin('USER_DEACTIVATED', existingUser.id, {
          email,
          organizationId: org.id,
        });
      }
    }

    // Upsert the user in that organization
    let user;
    if (!existingUser) {
      user = await prisma.users.create({
        data: {
          id: randomUUID(),
          email,
          full_name: name,
          role: mappedRole,
          is_active: true,
          organizationId: org.id,
          last_login_at: new Date(),
        },
      });
    } else {
      user = existingUser;
      const updateData: any = {
        last_login_at: new Date(),
      };
      if (candidateRoleValues.length > 0 && existingUser.role !== 'SUPER_ADMIN' && existingUser.role !== mappedRole) {
        // Sync role if assertion explicitly sent role/groups (never touching a SUPER_ADMIN)
        updateData.role = mappedRole;
      }
      user = await prisma.users.update({
        where: { id: existingUser.id },
        data: updateData,
      });
      if (!user?.id) {
        user = { ...existingUser, ...updateData };
      }
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
// SCIM 2.0 CONTROLLER & HELPERS
// ==========================================

/**
 * Standard RFC 7644 SCIM 2.0 error response helper.
 * Always responds with Content-Type: application/scim+json and schema urn:ietf:params:scim:api:messages:2.0:Error.
 */
export const sendScimError = (res: Response, status: number, detail: string) => {
  return res.status(status).type('application/scim+json').json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    status: String(status),
    detail,
  });
};

/**
 * Resolves a valid user ID within an organization to attribute audit log entries for SCIM actions.
 * In Sentraa, audit_logs.user_id has a strict foreign key to users(id).
 * Using pseudo-IDs like 'scim_agent' violates the foreign key constraint on real PostgreSQL.
 * We resolve an active ADMIN (or any existing user) from the same organization,
 * while recording detailed SCIM actor and target information in the audit metadata.
 */
export const resolveAuditActorUserId = async (organizationId: string): Promise<string | null> => {
  const adminUser = await prisma.users.findFirst({
    where: { organizationId, role: 'ADMIN', is_active: true },
    select: { id: true },
    orderBy: { created_at: 'asc' },
  });
  if (adminUser) return adminUser.id;

  const anyUser = await prisma.users.findFirst({
    where: { organizationId },
    select: { id: true },
    orderBy: { created_at: 'asc' },
  });
  if (anyUser) return anyUser.id;

  return null;
};

interface LogScimAuditParams {
  organizationId: string;
  action: 'SCIM_USER_PROVISIONED' | 'SCIM_USER_UPDATED' | 'SCIM_USER_DEACTIVATED';
  targetUserId: string;
  metadata?: Record<string, any>;
}

export const logScimAudit = async ({
  organizationId,
  action,
  targetUserId,
  metadata = {},
}: LogScimAuditParams): Promise<void> => {
  const actorUserId = await resolveAuditActorUserId(organizationId);

  if (!actorUserId) {
    logger.warn(
      `[SCIM-AUDIT] Skipping audit log for action ${action}: No valid user found for organization ${organizationId} to satisfy audit_logs user_id foreign key constraint.`
    );
    return;
  }

  await auditLogger.log({
    userId: actorUserId,
    organizationId,
    action,
    metadata: {
      actor: 'scim',
      tokenOwner: actorUserId,
      targetUserId,
      ...metadata,
    },
  });
};

export const getScimUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return sendScimError(res, 501, 'SSO is not enabled for this organization');
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return sendScimError(res, 501, 'SSO is not enabled for this organization');
    }

    const { userName, emails, name, active } = req.body;
    const email = userName || emails?.[0]?.value;
    const fullName = name?.formatted || `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || email?.split('@')[0];

    if (!email) {
      return sendScimError(res, 400, 'Username/Email is required');
    }

    // Verify user doesn't exist
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return sendScimError(res, 409, 'User already exists');
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

    await logScimAudit({
      organizationId,
      action: 'SCIM_USER_PROVISIONED',
      targetUserId: newUser.id,
      metadata: { userId: newUser.id, email },
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return sendScimError(res, 501, 'SSO is not enabled for this organization');
    }

    const id = req.params.id as string;
    const { name, active } = req.body;

    const user = await prisma.users.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      return sendScimError(res, 404, 'User not found');
    }

    const updateData: any = {};
    if (name?.formatted) {
      updateData.full_name = name.formatted;
    } else if (name?.givenName || name?.familyName) {
      updateData.full_name = `${name.givenName || ''} ${name.familyName || ''}`.trim();
    }

    let isDeactivation = false;
    if (active !== undefined) {
      const boolActive = active === true || String(active).toLowerCase() === 'true';
      updateData.is_active = boolActive;
      if (!boolActive) {
        isDeactivation = true;
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
    });

    if (isDeactivation || (updatedUser.is_active === false && user.is_active === true)) {
      await logScimAudit({
        organizationId,
        action: 'SCIM_USER_DEACTIVATED',
        targetUserId: id,
        metadata: { userId: id },
      });
      await revokeUserSessions(id);
    } else {
      await logScimAudit({
        organizationId,
        action: 'SCIM_USER_UPDATED',
        targetUserId: id,
        metadata: { userId: id, active: updatedUser.is_active },
      });
    }

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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    if (!org || !org.sso_enabled) {
      return sendScimError(res, 501, 'SSO is not enabled for this organization');
    }

    const { id } = req.params;
    const user = await prisma.users.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      return sendScimError(res, 404, 'User not found');
    }

    // SCIM soft-deletes/suspends user by setting active to false for audit trail integrity
    await prisma.users.update({
      where: { id },
      data: { is_active: false },
    });

    await logScimAudit({
      organizationId,
      action: 'SCIM_USER_DEACTIVATED',
      targetUserId: id,
      metadata: { userId: id },
    });

    // Invalidate active JWT sessions immediately
    await revokeUserSessions(id);

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getScimUserById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }
    const { id } = req.params;
    const user = await prisma.users.findFirst({ where: { id, organizationId } });
    if (!user) {
      return sendScimError(res, 404, 'User not found');
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }
    const { id } = req.params;
    const user = await prisma.users.findFirst({ where: { id, organizationId } });
    if (!user) {
      return sendScimError(res, 404, 'User not found');
    }

    const { Operations } = req.body;
    if (!Operations || !Array.isArray(Operations)) {
      return sendScimError(res, 400, 'Invalid operations format');
    }

    const updateData: any = {};
    let isDeactivation = false;

    for (const op of Operations) {
      const opType = String(op.op || '').toLowerCase();
      const rawPath = op.path ? String(op.path).trim().toLowerCase() : '';
      const value = op.value;

      if (opType === 'replace' || opType === 'add') {
        // (a) Form A: op replace/add, path "active" (case-insensitive)
        if (rawPath === 'active') {
          const boolActive = value === true || String(value).toLowerCase() === 'true';
          updateData.is_active = boolActive;
          if (!boolActive) {
            isDeactivation = true;
          }
        }
        // (b) Form B: op replace/add, NO path (or empty), value object containing { active: ... }
        else if (!rawPath && typeof value === 'object' && value !== null) {
          const valObj = (Array.isArray(value) ? value[0] : value) as Record<string, any>;
          if (valObj && typeof valObj === 'object') {
            const activeKey = Object.keys(valObj).find((k) => k.toLowerCase() === 'active');
            if (activeKey !== undefined) {
              const rawVal = valObj[activeKey];
              const boolActive = rawVal === true || String(rawVal).toLowerCase() === 'true';
              updateData.is_active = boolActive;
              if (!boolActive) {
                isDeactivation = true;
              }
            }
            if (valObj.name) {
              const nameObj = valObj.name;
              if (nameObj.formatted) {
                updateData.full_name = nameObj.formatted;
              } else if (nameObj.givenName || nameObj.familyName) {
                updateData.full_name = `${nameObj.givenName || ''} ${nameObj.familyName || ''}`.trim();
              }
            }
          }
        }

        // Support name path updates
        if (rawPath === 'name.formatted') {
          updateData.full_name = String(value);
        } else if (rawPath === 'name' && typeof value === 'object' && value !== null) {
          if (value.formatted) {
            updateData.full_name = value.formatted;
          } else if (value.givenName || value.familyName) {
            updateData.full_name = `${value.givenName || ''} ${value.familyName || ''}`.trim();
          }
        }
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
    });

    if (isDeactivation || (updatedUser.is_active === false && user.is_active === true)) {
      await logScimAudit({
        organizationId,
        action: 'SCIM_USER_DEACTIVATED',
        targetUserId: id,
        metadata: { userId: id },
      });
      await revokeUserSessions(id);
    } else {
      await logScimAudit({
        organizationId,
        action: 'SCIM_USER_UPDATED',
        targetUserId: id,
        metadata: { userId: id, updateData },
      });
    }

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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const { id } = req.params;
    const roleName = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(roleName)) {
      return sendScimError(res, 404, 'Group not found');
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const { displayName, members } = req.body;
    const targetRole = String(displayName || '').toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return sendScimError(
        res,
        400,
        `Group '${displayName}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      );
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const { id } = req.params;
    const { displayName, members } = req.body;
    const targetRole = String(displayName || '').toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return sendScimError(
        res,
        400,
        `Group '${displayName}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      );
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const { id } = req.params;
    const targetRole = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return sendScimError(
        res,
        400,
        `Group '${id}' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.`
      );
    }

    const { Operations } = req.body;
    if (!Operations || !Array.isArray(Operations)) {
      return sendScimError(res, 400, 'Invalid operations format');
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
      return sendScimError(res, 401, 'Invalid SCIM Bearer credentials');
    }

    const { id } = req.params;
    const targetRole = String(id).toUpperCase();
    const rolesList = ['ADMIN', 'MEMBER', 'VIEWER', 'AUDITOR', 'ENGINEER'];

    if (!rolesList.includes(targetRole)) {
      return sendScimError(res, 404, 'Group not found');
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
