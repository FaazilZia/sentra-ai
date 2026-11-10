import { randomUUID } from 'crypto';
import prisma from '../config/db';
import {
  createScimUser,
  updateScimUser,
  patchScimUser,
  deleteScimUser,
  logScimAudit,
  resolveAuditActorUserId,
} from '../controllers/sso.controller';

/**
 * Real Database Test for Bug 1:
 * Verifies against a local PostgreSQL database that SCIM create, update, and deactivate
 * handlers write REAL rows into the audit_logs table WITHOUT mocking auditLogger.
 *
 * Verifies that:
 * 1. audit_logs.user_id foreign key constraint is satisfied by resolving an active ADMIN from the org.
 * 2. Detailed SCIM actor information (actor: 'scim', tokenOwner, targetUserId) is saved in metadata.
 * 3. When an organization has no valid users, the FK-breaking insert is skipped safely with a warning.
 */
describe('SCIM Real PostgreSQL Audit Logging (No Mocking)', () => {
  const RUN_ID = randomUUID().slice(0, 8);
  const TEST_ORG_ID = randomUUID();
  const TEST_ADMIN_ID = randomUUID();
  const TEST_ADMIN_EMAIL = `admin-${RUN_ID}@scim-realdb.ai`;

  let createdScimUserId: string;

  const makeMockRes = () => {
    const res: any = {
      statusCode: 200,
      headers: {},
      body: null,
      status: jest.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
      }),
      type: jest.fn().mockImplementation((type: string) => {
        res.headers['content-type'] = type;
        return res;
      }),
      json: jest.fn().mockImplementation((data: any) => {
        res.body = data;
        return res;
      }),
      end: jest.fn().mockImplementation(() => {
        return res;
      }),
      setHeader: jest.fn().mockImplementation((name: string, val: string) => {
        res.headers[name.toLowerCase()] = val;
        return res;
      }),
    };
    return res;
  };

  beforeAll(async () => {
    // 1. Create a real organization in the local PostgreSQL test database
    await prisma.organizations.create({
      data: {
        id: TEST_ORG_ID,
        name: `Real SCIM Audit Org ${RUN_ID}`,
        slug: `real-scim-audit-${RUN_ID}`,
        is_active: true,
        sso_enabled: true,
        sso_provider: 'Okta',
      },
    });

    // 2. Create an admin user inside the organization to satisfy the audit_logs FK constraint
    await prisma.users.create({
      data: {
        id: TEST_ADMIN_ID,
        email: TEST_ADMIN_EMAIL,
        full_name: 'Real SCIM Org Admin',
        password_hash: 'scim_real_pw_hash',
        role: 'ADMIN',
        is_active: true,
        organizationId: TEST_ORG_ID,
        email_verified: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up local database test rows
    try {
      await prisma.audit_logs.deleteMany({ where: { organizationId: TEST_ORG_ID } });
      await prisma.users.deleteMany({ where: { organizationId: TEST_ORG_ID } });
      await prisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } });
    } catch {
      // Ignore cleanup error
    }
  });

  it('resolves the real organization admin ID as the audit actor', async () => {
    const actorId = await resolveAuditActorUserId(TEST_ORG_ID);
    expect(actorId).toBe(TEST_ADMIN_ID);
  });

  it('creates SCIM user and writes a real SCIM_USER_PROVISIONED row to audit_logs in PostgreSQL', async () => {
    const targetEmail = `provisioned-${RUN_ID}@scim-realdb.ai`;
    const req: any = {
      user: { organizationId: TEST_ORG_ID },
      body: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: targetEmail,
        name: { formatted: 'Real Provisioned Employee' },
        active: true,
      },
    };
    const res = makeMockRes();
    const next = jest.fn();

    await createScimUser(req, res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdScimUserId = res.body.id;

    // Verify row in real Postgres audit_logs table
    const auditRecord = await prisma.audit_logs.findFirst({
      where: {
        organizationId: TEST_ORG_ID,
        action: 'SCIM_USER_PROVISIONED',
      },
      orderBy: { timestamp: 'desc' },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.user_id).toBe(TEST_ADMIN_ID);
    expect(auditRecord?.action).toBe('SCIM_USER_PROVISIONED');

    const meta = auditRecord?.metadata as any;
    expect(meta.actor).toBe('scim');
    expect(meta.tokenOwner).toBe(TEST_ADMIN_ID);
    expect(meta.targetUserId).toBe(createdScimUserId);
    expect(meta.email).toBe(targetEmail);
  });

  it('updates SCIM user and writes a real SCIM_USER_UPDATED row to audit_logs in PostgreSQL', async () => {
    const req: any = {
      user: { organizationId: TEST_ORG_ID },
      params: { id: createdScimUserId },
      body: {
        name: { formatted: 'Real Provisioned Employee (Updated Name)' },
        active: true,
      },
    };
    const res = makeMockRes();
    const next = jest.fn();

    await updateScimUser(req, res, next);

    expect(res.statusCode).toBe(200);

    const auditRecord = await prisma.audit_logs.findFirst({
      where: {
        organizationId: TEST_ORG_ID,
        action: 'SCIM_USER_UPDATED',
      },
      orderBy: { timestamp: 'desc' },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.user_id).toBe(TEST_ADMIN_ID);
    expect(auditRecord?.action).toBe('SCIM_USER_UPDATED');

    const meta = auditRecord?.metadata as any;
    expect(meta.actor).toBe('scim');
    expect(meta.tokenOwner).toBe(TEST_ADMIN_ID);
    expect(meta.targetUserId).toBe(createdScimUserId);
    expect(meta.active).toBe(true);
  });

  it('patches SCIM user to deactivated and writes a real SCIM_USER_DEACTIVATED row to audit_logs in PostgreSQL', async () => {
    const req: any = {
      user: { organizationId: TEST_ORG_ID },
      params: { id: createdScimUserId },
      body: {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          {
            op: 'replace',
            path: 'active',
            value: false,
          },
        ],
      },
    };
    const res = makeMockRes();
    const next = jest.fn();

    await patchScimUser(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body.active).toBe(false);

    const auditRecord = await prisma.audit_logs.findFirst({
      where: {
        organizationId: TEST_ORG_ID,
        action: 'SCIM_USER_DEACTIVATED',
      },
      orderBy: { timestamp: 'desc' },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.user_id).toBe(TEST_ADMIN_ID);
    expect(auditRecord?.action).toBe('SCIM_USER_DEACTIVATED');

    const meta = auditRecord?.metadata as any;
    expect(meta.actor).toBe('scim');
    expect(meta.tokenOwner).toBe(TEST_ADMIN_ID);
    expect(meta.targetUserId).toBe(createdScimUserId);
  });

  it('deletes (suspends) SCIM user and writes a real SCIM_USER_DEACTIVATED row to audit_logs in PostgreSQL', async () => {
    const req: any = {
      user: { organizationId: TEST_ORG_ID },
      params: { id: createdScimUserId },
    };
    const res = makeMockRes();
    const next = jest.fn();

    await deleteScimUser(req, res, next);

    expect(res.statusCode).toBe(204);

    const auditRecords = await prisma.audit_logs.findMany({
      where: {
        organizationId: TEST_ORG_ID,
        action: 'SCIM_USER_DEACTIVATED',
      },
      orderBy: { timestamp: 'desc' },
    });

    expect(auditRecords.length).toBeGreaterThanOrEqual(2);
    expect(auditRecords[0].user_id).toBe(TEST_ADMIN_ID);
  });

  it('skips writing FK-violating row and logs warning when no valid user exists for organization', async () => {
    const emptyOrgId = randomUUID();
    await prisma.organizations.create({
      data: {
        id: emptyOrgId,
        name: `Empty Org ${RUN_ID}`,
        slug: `empty-org-${RUN_ID}`,
        is_active: true,
        sso_enabled: true,
      },
    });

    try {
      // Direct call to logScimAudit for an org with 0 users
      await logScimAudit({
        organizationId: emptyOrgId,
        action: 'SCIM_USER_PROVISIONED',
        targetUserId: 'dummy-target-user',
        metadata: { email: 'orphan@scim.com' },
      });

      // Assert NO audit_log was created for this org, preventing foreign key failure
      const count = await prisma.audit_logs.count({
        where: { organizationId: emptyOrgId },
      });
      expect(count).toBe(0);
    } finally {
      await prisma.organizations.deleteMany({ where: { id: emptyOrgId } });
    }
  });
});
