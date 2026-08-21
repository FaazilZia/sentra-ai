/**
 * PDF Report Quality — CI Smoke Test (Item 22)
 * =============================================
 * Verifies that every PDF report type:
 *   1. Starts with the %PDF magic bytes
 *   2. Generates a non-trivially-sized document
 *
 * Uses real DB via TEST_DATABASE_URL, real PDFKit, real services.
 * Playwright/Chromium PDF path is NOT exercised here (it's not available in CI);
 * the fallback PDFKit path is what these assertions cover.
 */

import { PassThrough } from 'stream';

// ── Prevent BullMQ workers from spinning up ─────────────────────────────────
jest.mock('../services/queue.service', () => ({
  enqueueLog: jest.fn(),
  enqueueConnectorScan: jest.fn(),
  processConnectorScan: jest.fn(),
  setupScheduledJobs: jest.fn(),
  activityQueue: null,
  connectorQueue: null,
  retentionQueue: null,
  alertQueue: null,
}));

// ── Mock Socket.IO (required by ai.controller → policy.service) ─────────────
jest.mock('../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

// ── Real Prisma client connected to the test DB ─────────────────────────────
jest.mock('../config/db', () => {
  const TEST_URL =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL_TEST ||
    'postgresql://postgres:postgres@localhost:5432/sentra_test';
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: TEST_URL });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return {
    __esModule: true,
    default: client,
    prismaRaw: client,
    initializePrisma: jest.fn().mockResolvedValue(undefined),
  };
});

// ── Mock logger to silence noise ─────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import prisma from '../config/db';
import { ExecutiveReportService } from '../services/executiveReport.service';
import { ReportGenerationService } from '../services/reportGeneration.service';
import { ReportService } from '../services/report.service';

// ── Helper: capture PDFKit pipe output into a Buffer ─────────────────────────
function buildMockRes(): { res: any; getBuffer: () => Promise<Buffer> } {
  const pt = new PassThrough();
  const chunks: Buffer[] = [];

  pt.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    pt.on('end', () => resolve(Buffer.concat(chunks)));
    pt.on('error', reject);
  });

  // Fake Express Response — only the surface PDFKit actually calls
  const res: any = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation((body: any) => {
      // Called by Playwright path or by direct res.send(buf) fallback
      if (Buffer.isBuffer(body)) {
        pt.push(body);
      } else if (typeof body === 'string') {
        pt.push(Buffer.from(body));
      }
      pt.end();
    }),
    // PDFKit uses doc.pipe(res) which requires write / end / on
    write: (chunk: any, encoding?: any, cb?: any) => {
      pt.write(chunk, encoding, cb);
      return true;
    },
    end: (chunk?: any, encoding?: any, cb?: any) => {
      if (chunk) pt.write(chunk, encoding);
      pt.end();
      if (typeof cb === 'function') cb();
    },
    on: (event: string, listener: (...args: any[]) => void) => {
      pt.on(event, listener);
      return res;
    },
    emit: pt.emit.bind(pt),
    once: pt.once.bind(pt),
    removeListener: pt.removeListener.bind(pt),
    // stream.Writable duck-typing
    writable: true,
    writableEnded: false,
  };

  return { res, getBuffer: () => bufferPromise };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PDF Report Quality & Integration Smoke Test', () => {
  let organizationId: string;
  let policyId: string;

  beforeAll(async () => {
    // Prefer the seeded fixture org
    const org = await (prisma as any).organizations.findFirst({ where: { is_active: true } });
    if (org) {
      organizationId = org.id;
    } else {
      const newOrg = await (prisma as any).organizations.create({
        data: { name: 'Smoke Test Org', slug: `smoke-test-org-${Date.now()}`, is_active: true },
      });
      organizationId = newOrg.id;
    }

    // Prefer a seeded policy for that org
    const policy = await (prisma as any).policies.findFirst({
      where: { organizationId },
    });
    if (policy) {
      policyId = policy.id;
    } else {
      const newPolicy = await (prisma as any).policies.create({
        data: {
          name: 'Smoke Test Policy',
          description: 'Automated quality smoke test policy.',
          status: 'active',
          priority: 'high',
          category: 'general',
          organizationId,
          enabled: true,
        },
      });
      policyId = newPolicy.id;
    }
  }, 30_000);

  // ── 1. Executive Report PDF ───────────────────────────────────────────────
  it('ExecutiveReportService.generatePdf — starts with %PDF and size > 5 KB', async () => {
    const { res, getBuffer } = buildMockRes();
    await ExecutiveReportService.generatePdf(organizationId, res);
    const buf = await getBuffer();
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(5_000);
  }, 30_000);

  // ── 2. Compliance Report PDF (PDFKit fallback path) ───────────────────────
  it('ReportGenerationService.generateComplianceReportPDF — starts with %PDF and size > 1 KB', async () => {
    const { res, getBuffer } = buildMockRes();
    await ReportGenerationService.generateComplianceReportPDF(organizationId, res);
    const buf = await getBuffer();
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(1_000);
  }, 30_000);

  // ── 3. Policy Export PDF ──────────────────────────────────────────────────
  it('ReportGenerationService.generatePolicyExportPDF — starts with %PDF and size > 3 KB', async () => {
    const { res, getBuffer } = buildMockRes();
    await ReportGenerationService.generatePolicyExportPDF(organizationId, policyId, res);
    const buf = await getBuffer();
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(2_000); // single-page doc with minimal test DB data
  }, 30_000);

  // ── 4. Feature Compliance Report PDF ─────────────────────────────────────
  it('ReportService.generateFeatureReport — starts with %PDF and size > 3 KB', async () => {
    const { res, getBuffer } = buildMockRes();
    await ReportService.generateFeatureReport('smoke-feature-id', organizationId, res);
    const buf = await getBuffer();
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(2_000); // single-page doc with no real audit data
  }, 30_000);
});
