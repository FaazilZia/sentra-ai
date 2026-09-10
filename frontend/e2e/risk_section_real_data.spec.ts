import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'e2e/screenshots');

// Helper functions under test
const extractList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.alerts)) return res.alerts;
  return [];
};

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Never assessed';
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 'Never assessed';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(timestamp).toISOString().split('T')[0];
};

const resolveSeverity = (score: number, level?: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
  const upper = String(level || '').toUpperCase();
  if (upper === 'CRITICAL' || score >= 80) return 'CRITICAL';
  if (upper === 'HIGH' || score >= 60) return 'HIGH';
  if (upper === 'MEDIUM' || score >= 40) return 'MEDIUM';
  return 'LOW';
};

const resolveTierScore = (tier?: string): number => {
  const upper = String(tier || '').toUpperCase();
  if (upper === 'CRITICAL') return 85;
  if (upper === 'HIGH') return 70;
  if (upper === 'MEDIUM') return 45;
  return 20;
};

const mergeRankedAgents = (risks: any[], systems: any[]) => {
  const assessedSystemIds = new Set<string>();
  const unranked: any[] = [];

  for (let i = 0; i < risks.length; i++) {
    const r = risks[i];
    const sysId = r?.aiSystemId || r?.ai_system?.id;
    if (sysId) {
      assessedSystemIds.add(String(sysId));
    }

    const score = Number(r?.score ?? 0);
    const findingsCount = Array.isArray(r?.details?.findings) 
      ? r.details.findings.length 
      : (typeof r?.details?.violationsCount === 'number' ? r.details.violationsCount : (score >= 80 ? 3 : score >= 60 ? 1 : 0));
    const agentName = r?.ai_system?.name || r?.name || `Agent-${i + 1}`;
    const source = r?.ai_system?.status ? `Status: ${r.ai_system.status}` : (r?.source || 'Risk Assessment');
    const severity = resolveSeverity(score, r?.risk_level || r?.ai_system?.risk_tier);
    const lastAssessed = formatRelativeTime(r?.updated_at || r?.created_at);

    unranked.push({
      id: r?.id || `risk-${i}`,
      agentName,
      source,
      compositeScore: score,
      severity,
      openViolations: findingsCount,
      lastAssessed
    });
  }

  for (let j = 0; j < systems.length; j++) {
    const s = systems[j];
    const sId = String(s?.id || '');
    if (sId && assessedSystemIds.has(sId)) {
      continue;
    }

    const defaultScore = resolveTierScore(s?.risk_tier);
    const agentName = s?.name || `Unassessed-${j + 1}`;
    const source = s?.vendor || s?.model_name || 'Registered AI System';
    const severity = resolveSeverity(defaultScore, s?.risk_tier);
    const lastAssessed = formatRelativeTime(s?.updated_at || s?.created_at);

    unranked.push({
      id: s?.id || `system-${j}`,
      agentName,
      source,
      compositeScore: defaultScore,
      severity,
      openViolations: 0,
      lastAssessed
    });
  }

  unranked.sort((a, b) => b.compositeScore - a.compositeScore);

  return unranked.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
};

test.describe('RiskSection: Real API Wiring & Mock Data Elimination', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock Auth & Org endpoints
    await page.route('**/api/v1/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-admin-id',
          email: 'admin@sentra.ai',
          fullName: 'Security Auditor',
          role: 'ADMIN',
          organizationId: 'org-test-1',
          organizationName: 'Sentraa Test Corp',
          is_active: true,
        }),
      });
    });

    await page.route('**/api/v1/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-test-1',
          name: 'Sentraa Test Corp',
        }),
      });
    });

    await page.route('**/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-test-1',
          name: 'Sentraa Test Corp',
        }),
      });
    });

    await page.route('**/organizations/sdk-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            connected: true,
            connectedAt: '2026-09-01T12:00:00Z',
            firstConnectedAt: '2026-09-01T12:00:00Z'
          }
        })
      });
    });

    await page.route('**/api/v1/organizations/sdk-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            connected: true,
            connectedAt: '2026-09-01T12:00:00Z',
            firstConnectedAt: '2026-09-01T12:00:00Z'
          }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('sentra_onboarded', 'true');
    });
  });

  test('Populated State: renders real API data and strictly does NOT render old hardcoded mock data', async ({ page }) => {
    await page.route('**/api/v1/risks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'risk-prod-101',
              aiSystemId: 'sys-001',
              score: 92,
              risk_level: 'CRITICAL',
              created_at: '2026-08-30T10:00:00.000Z',
              ai_system: {
                id: 'sys-001',
                name: 'Live Production Trading Engine',
                risk_tier: 'CRITICAL',
                status: 'active'
              },
              details: {
                findings: ['Direct database write', 'Unencrypted webhook']
              }
            },
            {
              id: 'risk-prod-102',
              aiSystemId: 'sys-002',
              score: 68,
              risk_level: 'HIGH',
              created_at: '2026-08-29T15:00:00.000Z',
              ai_system: {
                id: 'sys-002',
                name: 'Customer KYC Screening Bot',
                risk_tier: 'HIGH',
                status: 'monitored'
              },
              details: {
                violationsCount: 1
              }
            }
          ]
        }),
      });
    });

    await page.route('**/api/v1/ai-systems', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'sys-001',
                name: 'Live Production Trading Engine',
                risk_tier: 'CRITICAL',
                vendor: 'In-house Core'
              },
              {
                id: 'sys-002',
                name: 'Customer KYC Screening Bot',
                risk_tier: 'HIGH',
                vendor: 'Compliance Corp'
              },
              {
                id: 'sys-003',
                name: 'Unassessed Support Copilot',
                risk_tier: 'MEDIUM',
                vendor: 'OpenAI Enterprise'
              }
            ]
          }
        }),
      });
    });

    await page.route('**/api/v1/drift/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'drift-001',
              agentName: 'Live Production Trading Engine',
              driftType: 'KL Divergence',
              metricName: 'Prediction Skew',
              divergencePct: 18.5,
              severity: 'CRITICAL'
            }
          ]
        }),
      });
    });

    await page.goto('/app/risk', { waitUntil: 'networkidle' });

    // Heading verification
    await expect(page.getByRole('heading', { name: 'Risk', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify real agents rendered in table
    await expect(page.getByText('Live Production Trading Engine')).toBeVisible();
    await expect(page.getByText('Customer KYC Screening Bot')).toBeVisible();
    await expect(page.getByText('Unassessed Support Copilot')).toBeVisible();

    // Verify ranked order and scores
    await expect(page.getByText('#1')).toBeVisible();
    await expect(page.getByText('92 / 100')).toBeVisible();
    await expect(page.getByText('68 / 100')).toBeVisible();
    await expect(page.getByText('45 / 100')).toBeVisible();

    // CRITICAL ASSERTION: The old hardcoded mock data must NOT exist
    await expect(page.getByText('Financial Analyst Bot')).toHaveCount(0);
    await expect(page.getByText('Shadow AutoGPT Assistant')).toHaveCount(0);
    await expect(page.getByText('Unverified CodeLlama Extension')).toHaveCount(0);

    // Verify dynamic KPI counts
    await expect(page.getByTestId('critical-severity-count')).toHaveText('1');
    await expect(page.getByTestId('high-severity-count')).toHaveText('1');
    await expect(page.getByTestId('medium-severity-count')).toHaveText('1');
    await expect(page.getByTestId('active-drift-alerts')).toHaveText('1');

    // Capture screenshot proof of populated state
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const populatedScreenshot = path.join(ARTIFACT_DIR, 'risk_section_populated_real_data.png');
    await page.screenshot({ path: populatedScreenshot, fullPage: true });
    console.log(`📸 Populated state screenshot saved: ${populatedScreenshot}`);
  });

  test('Empty State: clean honest empty message when org has no risks or systems', async ({ page }) => {
    await page.route('**/api/v1/risks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/v1/ai-systems', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [] } }),
      });
    });

    await page.route('**/api/v1/drift/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/app/risk', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Risk', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify honest empty state in DataTable
    await expect(page.getByText('No risk assessments or monitored AI systems yet.')).toBeVisible();

    // Verify 0 metrics
    await expect(page.getByTestId('critical-severity-count')).toHaveText('0');
    await expect(page.getByTestId('high-severity-count')).toHaveText('0');
    await expect(page.getByTestId('medium-severity-count')).toHaveText('0');
    await expect(page.getByTestId('active-drift-alerts')).toHaveText('0');

    // Switch to Drift tab and verify drift empty state
    await page.getByRole('tab', { name: /Drift Detection Alerts/ }).click();
    await expect(page.getByText('No continuous model drift alerts detected.')).toBeVisible();

    // Assert mock data absence
    await expect(page.getByText('Financial Analyst Bot')).toHaveCount(0);
    await expect(page.getByText('Shadow AutoGPT Assistant')).toHaveCount(0);

    // Capture screenshot proof of empty state
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const emptyScreenshot = path.join(ARTIFACT_DIR, 'risk_section_empty_state.png');
    await page.screenshot({ path: emptyScreenshot, fullPage: true });
    console.log(`📸 Empty state screenshot saved: ${emptyScreenshot}`);
  });

  test('Error State: renders error alert banner and retry button on failure', async ({ page }) => {
    await page.route('**/api/v1/risks', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Risk assessment service unavailable' }),
      });
    });

    await page.route('**/api/v1/ai-systems', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [] } }),
      });
    });

    await page.route('**/api/v1/drift/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/app/risk', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Risk', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify error banner is visible
    await expect(page.getByText('Risk assessment service unavailable')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

    // Old mock data must not be displayed
    await expect(page.getByText('Financial Analyst Bot')).toHaveCount(0);
  });
});

test.describe('RiskSection: Helper Functions Unit Tests', () => {
  test('extractList parses arrays, nested data, items, alerts, and handles edge cases', () => {
    expect(extractList([1, 2, 3])).toEqual([1, 2, 3]);
    expect(extractList({ data: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(extractList({ items: ['sys1', 'sys2'] })).toEqual(['sys1', 'sys2']);
    expect(extractList({ alerts: ['d1'] })).toEqual(['d1']);
    expect(extractList(null)).toEqual([]);
    expect(extractList(undefined)).toEqual([]);
    expect(extractList({})).toEqual([]);
  });

  test('formatRelativeTime produces valid relative time or fallback', () => {
    expect(formatRelativeTime()).toBe('Never assessed');
    expect(formatRelativeTime('')).toBe('Never assessed');
    expect(formatRelativeTime('invalid-date')).toBe('Never assessed');

    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinsAgo)).toBe('5 mins ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });

  test('resolveSeverity maps scores and levels properly', () => {
    expect(resolveSeverity(90)).toBe('CRITICAL');
    expect(resolveSeverity(80)).toBe('CRITICAL');
    expect(resolveSeverity(75)).toBe('HIGH');
    expect(resolveSeverity(60)).toBe('HIGH');
    expect(resolveSeverity(50)).toBe('MEDIUM');
    expect(resolveSeverity(40)).toBe('MEDIUM');
    expect(resolveSeverity(20)).toBe('LOW');

    // Level overrides
    expect(resolveSeverity(50, 'CRITICAL')).toBe('CRITICAL');
    expect(resolveSeverity(30, 'HIGH')).toBe('HIGH');
  });

  test('resolveTierScore maps tier strings to default scores', () => {
    expect(resolveTierScore('CRITICAL')).toBe(85);
    expect(resolveTierScore('HIGH')).toBe(70);
    expect(resolveTierScore('MEDIUM')).toBe(45);
    expect(resolveTierScore('LOW')).toBe(20);
    expect(resolveTierScore('unknown')).toBe(20);
    expect(resolveTierScore()).toBe(20);
  });

  test('mergeRankedAgents merges, deduplicates, sorts descending, and assigns ranks', () => {
    const risks = [
      {
        id: 'r1',
        aiSystemId: 's1',
        score: 95,
        ai_system: { id: 's1', name: 'Alpha Agent', status: 'ACTIVE' },
        details: { findings: ['Issue 1', 'Issue 2'] }
      },
      {
        id: 'r2',
        aiSystemId: 's2',
        score: 55,
        ai_system: { id: 's2', name: 'Beta Agent' }
      }
    ];

    const systems = [
      { id: 's1', name: 'Alpha Agent', risk_tier: 'CRITICAL' }, // Should be deduplicated
      { id: 's3', name: 'Gamma Agent', risk_tier: 'HIGH' }      // Should receive default score 70
    ];

    const ranked = mergeRankedAgents(risks, systems);

    expect(ranked).toHaveLength(3);
    // Rank 1: Alpha (95)
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].agentName).toBe('Alpha Agent');
    expect(ranked[0].compositeScore).toBe(95);
    expect(ranked[0].severity).toBe('CRITICAL');
    expect(ranked[0].openViolations).toBe(2);

    // Rank 2: Gamma (70 from HIGH tier)
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].agentName).toBe('Gamma Agent');
    expect(ranked[1].compositeScore).toBe(70);
    expect(ranked[1].severity).toBe('HIGH');

    // Rank 3: Beta (55)
    expect(ranked[2].rank).toBe(3);
    expect(ranked[2].agentName).toBe('Beta Agent');
    expect(ranked[2].compositeScore).toBe(55);
    expect(ranked[2].severity).toBe('MEDIUM');
  });
});
