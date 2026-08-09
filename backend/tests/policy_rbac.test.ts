import request from 'supertest';
import express from 'express';
import policyRoutes from '../src/routes/policy.routes';
import prisma from '../src/config/db';

// Mock dependencies
jest.mock('../src/config/db', () => ({
  users: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  policies: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue({ id: 'pol-1', name: 'Test Policy', organizationId: 'org-1' }),
    create: jest.fn().mockResolvedValue({ id: 'pol-1', name: 'New Policy', organizationId: 'org-1' }),
    update: jest.fn().mockResolvedValue({ id: 'pol-1', name: 'Updated Policy', organizationId: 'org-1' }),
    delete: jest.fn().mockResolvedValue({ id: 'pol-1' }),
  },
  user_roles: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  subscriptions: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
    invalidate: jest.fn().mockResolvedValue(true),
  },
}));

// Mock authenticate middleware to inject custom user role
let mockUser: any = null;

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockUser) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    req.user = mockUser;
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/policies', policyRoutes);

describe('Policy Routes RBAC Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Policy Creation (POST /policies)', () => {
    it('should return 403 Forbidden for VIEWER role', async () => {
      mockUser = { id: 'usr-viewer', role: 'VIEWER', organizationId: 'org-1' };
      const res = await request(app)
        .post('/policies')
        .send({ name: 'Test Policy', status: 'draft' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should return 403 Forbidden for AUDITOR role', async () => {
      mockUser = { id: 'usr-auditor', role: 'AUDITOR', organizationId: 'org-1' };
      const res = await request(app)
        .post('/policies')
        .send({ name: 'Test Policy', status: 'draft' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should return 403 Forbidden for SECURITY_ANALYST role', async () => {
      mockUser = { id: 'usr-analyst', role: 'SECURITY_ANALYST', organizationId: 'org-1' };
      const res = await request(app)
        .post('/policies')
        .send({ name: 'Test Policy', status: 'draft' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should allow ADMIN role to create policies', async () => {
      mockUser = { id: 'usr-admin', role: 'ADMIN', organizationId: 'org-1' };
      const res = await request(app)
        .post('/policies')
        .send({ name: 'Test Policy', status: 'draft' });
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('should allow SUPER_ADMIN role to create policies', async () => {
      mockUser = { id: 'usr-superadmin', role: 'SUPER_ADMIN', organizationId: 'org-1' };
      const res = await request(app)
        .post('/policies')
        .send({ name: 'Test Policy', status: 'draft' });
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe('Policy Update (PUT /policies/:id)', () => {
    it('should return 403 Forbidden for VIEWER role', async () => {
      mockUser = { id: 'usr-viewer', role: 'VIEWER', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should return 403 Forbidden for AUDITOR role', async () => {
      mockUser = { id: 'usr-auditor', role: 'AUDITOR', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should return 403 Forbidden for SECURITY_ANALYST role', async () => {
      mockUser = { id: 'usr-analyst', role: 'SECURITY_ANALYST', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should allow COMPLIANCE_MANAGER role to update policies', async () => {
      mockUser = { id: 'usr-cm', role: 'COMPLIANCE_MANAGER', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('should allow ADMIN role to update policies', async () => {
      mockUser = { id: 'usr-admin', role: 'ADMIN', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('should allow SUPER_ADMIN role to update policies', async () => {
      mockUser = { id: 'usr-superadmin', role: 'SUPER_ADMIN', organizationId: 'org-1' };
      const res = await request(app)
        .put('/policies/pol-1')
        .send({ name: 'Updated Policy' });
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe('Policy Deletion (DELETE /policies/:id)', () => {
    it('should return 403 Forbidden for COMPLIANCE_MANAGER role on delete', async () => {
      mockUser = { id: 'usr-cm', role: 'COMPLIANCE_MANAGER', organizationId: 'org-1' };
      const res = await request(app).delete('/policies/pol-1');
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN role to delete policies', async () => {
      mockUser = { id: 'usr-admin', role: 'ADMIN', organizationId: 'org-1' };
      const res = await request(app).delete('/policies/pol-1');
      
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });
});
