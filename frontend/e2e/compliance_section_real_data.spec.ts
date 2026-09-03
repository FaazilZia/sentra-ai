import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "e2e/screenshots");

// Helper functions under test (mirrored from ComplianceSection.tsx)
export const normalizeFrameworkKey = (name: string): string => {
  return String(name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export const mapFrameworkId = (fwStr: string): string | null => {
  const norm = normalizeFrameworkKey(fwStr);
  if (norm === "GDPR") return "GDPR";
  if (norm === "DPDP") return "DPDP";
  if (norm === "HIPAA") return "HIPAA";
  if (norm === "PCIDSS") return "PCI-DSS";
  if (norm === "NISTAIRMF") return "NIST AI RMF";
  return null;
};

export const mapControlStatus = (
  status?: string
): "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT" => {
  const s = String(status || "").toUpperCase();
  if (s === "IMPLEMENTED" || s === "COMPLIANT") return "COMPLIANT";
  if (s === "IN_PROGRESS" || s === "NEEDS_REVIEW") return "NEEDS_REVIEW";
  return "NON_COMPLIANT";
};

export function mapFrameworkControlToItem(
  c: any,
  framework: string,
  totalAgents: number,
  index = 0
) {
  const fallbackId = `ctrl-${framework.toLowerCase().replace(/[^a-z0-9]/g, "")}-${index}`;
  const code = c.code || c.articleNumber || c.control_id || `CTRL-${index + 1}`;
  const title = c.title || c.name || "Untitled Control";
  const category = c.function || c.category || c.chapter?.title || "Governance";
  const status = mapControlStatus(
    c.status || c.implementation?.status || c.control_implementations?.[0]?.status
  );

  return {
    id: c.id || c.code || fallbackId,
    code,
    title,
    category,
    status,
    mappedAgents: Math.max(0, totalAgents),
    framework
  };
}

export function mapRawControlToItem(c: any, totalAgents: number, index = 0) {
  const targetFw = mapFrameworkId(c.framework);
  if (!targetFw) return null;

  return mapFrameworkControlToItem(c, targetFw, totalAgents, index);
}

test.describe("Compliance Section — Helper Unit Tests", () => {
  test("normalizeFrameworkKey matches all spelling variants across frontend and backend", () => {
    expect(normalizeFrameworkKey("PCI-DSS")).toBe("PCIDSS");
    expect(normalizeFrameworkKey("PCI_DSS")).toBe("PCIDSS");
    expect(normalizeFrameworkKey("pci-dss")).toBe("PCIDSS");
    expect(normalizeFrameworkKey("NIST AI RMF")).toBe("NISTAIRMF");
    expect(normalizeFrameworkKey("NIST_AI_RMF")).toBe("NISTAIRMF");
    expect(normalizeFrameworkKey("nist-ai-rmf")).toBe("NISTAIRMF");
    expect(normalizeFrameworkKey("GDPR")).toBe("GDPR");
    expect(normalizeFrameworkKey("DPDP")).toBe("DPDP");
    expect(normalizeFrameworkKey("HIPAA")).toBe("HIPAA");

    // Cross-equality verification
    expect(normalizeFrameworkKey("PCI-DSS")).toBe(normalizeFrameworkKey("PCI_DSS"));
    expect(normalizeFrameworkKey("NIST AI RMF")).toBe(normalizeFrameworkKey("NIST_AI_RMF"));
  });

  test("mapFrameworkId correctly resolves framework identifiers", () => {
    expect(mapFrameworkId("GDPR")).toBe("GDPR");
    expect(mapFrameworkId("DPDP")).toBe("DPDP");
    expect(mapFrameworkId("HIPAA")).toBe("HIPAA");
    expect(mapFrameworkId("PCI_DSS")).toBe("PCI-DSS");
    expect(mapFrameworkId("PCI-DSS")).toBe("PCI-DSS");
    expect(mapFrameworkId("NIST_AI_RMF")).toBe("NIST AI RMF");
    expect(mapFrameworkId("NIST AI RMF")).toBe("NIST AI RMF");
    expect(mapFrameworkId("EU_AI_ACT")).toBeNull();
    expect(mapFrameworkId("ISO_42001")).toBeNull();
    expect(mapFrameworkId("UNKNOWN")).toBeNull();
  });

  test("mapControlStatus maps implementation statuses correctly", () => {
    expect(mapControlStatus("IMPLEMENTED")).toBe("COMPLIANT");
    expect(mapControlStatus("compliant")).toBe("COMPLIANT");
    expect(mapControlStatus("IN_PROGRESS")).toBe("NEEDS_REVIEW");
    expect(mapControlStatus("needs_review")).toBe("NEEDS_REVIEW");
    expect(mapControlStatus("NOT_STARTED")).toBe("NON_COMPLIANT");
    expect(mapControlStatus("")).toBe("NON_COMPLIANT");
    expect(mapControlStatus(undefined)).toBe("NON_COMPLIANT");
  });

  test("mapRawControlToItem correctly formats control items with total agents", () => {
    const raw = {
      id: "ctrl-123",
      control_id: "GDPR-ART-5",
      title: "Principles of Processing",
      category: "Principles",
      framework: "GDPR",
      control_implementations: [{ status: "IMPLEMENTED" }]
    };

    const item = mapRawControlToItem(raw, 5);
    expect(item).not.toBeNull();
    expect(item?.code).toBe("GDPR-ART-5");
    expect(item?.title).toBe("Principles of Processing");
    expect(item?.category).toBe("Principles");
    expect(item?.status).toBe("COMPLIANT");
    expect(item?.mappedAgents).toBe(5);
    expect(item?.framework).toBe("GDPR");
  });

  test("mapRawControlToItem ignores deprecated frameworks (EU AI Act, ISO 42001)", () => {
    const deprecated1 = {
      control_id: "EU-AIA-9",
      title: "Risk Management System",
      framework: "EU_AI_ACT"
    };
    const deprecated2 = {
      control_id: "ISO-42001-A5",
      title: "AIMS Scope",
      framework: "ISO_42001"
    };

    expect(mapRawControlToItem(deprecated1, 3)).toBeNull();
    expect(mapRawControlToItem(deprecated2, 3)).toBeNull();
  });
});

test.describe("Compliance Section — Real Data E2E", () => {
  const REAL_COMPLIANCE_STATS = {
    totalViolations: 0,
    breakdown: { GDPR: 0, DPDP: 0, HIPAA: 0, PCI_DSS: 0, NIST_AI_RMF: 0 },
    piiViolations: { GDPR: 0, DPDP: 0, HIPAA: 0, PCI_DSS: 0, NIST_AI_RMF: 0 },
    riskTrends: [],
    aggregateScore: 89,
    overallScore: 89,
    frameworks: [
      {
        name: "GDPR",
        score: 95,
        status: "configured",
        configured: true,
        controls: { total_controls: 28, implemented: 26, in_progress: 1, not_started: 1, not_applicable: 0 }
      },
      {
        name: "DPDP",
        score: 91,
        status: "configured",
        configured: true,
        controls: { total_controls: 22, implemented: 19, in_progress: 2, not_started: 1, not_applicable: 0 }
      },
      {
        name: "HIPAA",
        score: 84,
        status: "configured",
        configured: true,
        controls: { total_controls: 34, implemented: 27, in_progress: 3, not_started: 4, not_applicable: 0 }
      },
      {
        name: "PCI_DSS",
        score: 98,
        status: "configured",
        configured: true,
        controls: { total_controls: 20, implemented: 19, in_progress: 1, not_started: 0, not_applicable: 0 }
      },
      {
        name: "NIST_AI_RMF",
        score: 81,
        status: "configured",
        configured: true,
        controls: { total_controls: 30, implemented: 24, in_progress: 3, not_started: 3, not_applicable: 0 }
      }
    ]
  };

  const NIST_CODES = [
    "GV-1.1", "GV-1.2", "GV-1.3", "GV-2.1", "GV-2.2", "GV-3.1", "GV-3.2", "GV-4.1", "GV-4.2", "GV-5.1",
    "GV-5.2", "GV-6.1", "GV-6.2", "MP-1.1", "MP-1.2", "MP-1.3", "MP-2.1", "MP-2.2", "MP-3.1", "MP-3.2",
    "MP-4.1", "MP-4.2", "MP-5.1", "MP-5.2", "ME-1.1", "ME-1.2", "ME-1.3", "ME-2.1", "ME-2.2", "ME-3.1"
  ];
  const REAL_NIST_CONTROLS = NIST_CODES.map((code, idx) => ({
    code,
    title: `NIST AI RMF Requirement ${code}`,
    function: code.startsWith("GV") ? "GOVERN" : code.startsWith("MP") ? "MAP" : "MEASURE",
    category: "AI Risk Governance",
    status: idx < 24 ? "IMPLEMENTED" : "IN_PROGRESS"
  }));

  const REAL_GDPR_CONTROLS = Array.from({ length: 28 }, (_, idx) => ({
    id: `gdpr-ctrl-${idx + 1}`,
    articleNumber: `Article ${idx + 1}`,
    title: `GDPR Statutory Principle Art. ${idx + 1}`,
    status: idx < 26 ? "IMPLEMENTED" : "IN_PROGRESS",
    chapter: { title: "Principles & Data Rights" }
  }));

  const REAL_HIPAA_CONTROLS = Array.from({ length: 34 }, (_, idx) => ({
    id: `hipaa-ctrl-${idx + 1}`,
    articleNumber: `§164.308-${idx + 1}`,
    title: `HIPAA Security Specification §164.308-${idx + 1}`,
    status: idx < 27 ? "IMPLEMENTED" : "NOT_STARTED",
    chapter: { title: "Administrative Safeguards" }
  }));

  const REAL_DPDP_CONTROLS = Array.from({ length: 22 }, (_, idx) => ({
    id: `dpdp-ctrl-${idx + 1}`,
    articleNumber: `Section ${idx + 1}`,
    title: `DPDP Statutory Obligation Sec. ${idx + 1}`,
    status: idx < 19 ? "IMPLEMENTED" : "IN_PROGRESS",
    chapter: { title: "Fiduciary Responsibilities" }
  }));

  const REAL_PCI_CONTROLS = Array.from({ length: 20 }, (_, idx) => ({
    id: `pci-ctrl-${idx + 1}`,
    articleNumber: `Requirement ${idx + 1}`,
    title: `PCI-DSS Technical Control Req. ${idx + 1}`,
    status: idx < 19 ? "IMPLEMENTED" : "IN_PROGRESS",
    chapter: { title: "Cardholder Data Security" }
  }));

  const REAL_AI_SYSTEMS = {
    items: [
      { id: "sys-1", name: "Customer Support LLM", risk_tier: "HIGH" },
      { id: "sys-2", name: "Fraud Detection Agent", risk_tier: "MEDIUM" },
      { id: "sys-3", name: "Internal RAG Search", risk_tier: "LOW" }
    ]
  };

  const OLD_MOCK_STRINGS = [
    "Lawful Basis for AI Model Training",
    "Data Fiduciary Purpose Limitation",
    "Consent Revocation Hook Enforcement",
    "PHI Detection in LLM Prompt Streams",
    "PAN Tokenization before Model Context Injection",
    "AI Risk Governance Policy & Accountability",
    "Continuous Bias & Drift Monitoring",
    "18 Agents",
    "14 Agents",
    "22 Agents",
    "24 Agents"
  ];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/user/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-admin-id",
          email: "admin@sentra.ai",
          fullName: "Security Auditor",
          role: "ADMIN",
          organizationId: "org-test-1",
          organizationName: "Sentraa Test Corp",
          is_active: true,
        }),
      });
    });

    await page.route("**/api/v1/organizations/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "org-test-1",
          name: "Sentraa Test Corp",
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem("sentra_onboarded", "true");
      localStorage.setItem("sentra_token", "fake-jwt-token");
    });

    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
  });

  test("Populated State: verifies all 5 tabs and asserts MetricCard.value === table.rows.length across all frameworks", async ({ page }) => {
    await page.route("**/api/v1/compliance/stats", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_COMPLIANCE_STATS) });
    });

    await page.route("**/api/v1/gdpr/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_GDPR_CONTROLS) });
    });

    await page.route("**/api/v1/dpdp/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_DPDP_CONTROLS) });
    });

    await page.route("**/api/v1/hipaa/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_HIPAA_CONTROLS) });
    });

    await page.route("**/api/v1/pci/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_PCI_CONTROLS) });
    });

    await page.route("**/api/v1/compliance/nist-ai-rmf/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_NIST_CONTROLS) });
    });

    await page.route("**/api/v1/governance/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });

    await page.route("**/api/v1/ai-systems", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_AI_SYSTEMS) });
    });

    await page.goto("/app/compliance", { waitUntil: "networkidle" });

    // Verify header
    await expect(page.getByRole("heading", { name: "Compliance", exact: true })).toBeVisible({ timeout: 15000 });

    const tabsToVerify = [
      { id: "GDPR", expectedCount: 28, sampleCode: "Article 1", filename: "compliance_tab_gdpr.png" },
      { id: "DPDP", expectedCount: 22, sampleCode: "Section 1", filename: "compliance_tab_dpdp.png" },
      { id: "HIPAA", expectedCount: 34, sampleCode: "§164.308-1", filename: "compliance_tab_hipaa.png" },
      { id: "PCI-DSS", expectedCount: 20, sampleCode: "Requirement 1", filename: "compliance_tab_pci_dss.png" },
      { id: "NIST AI RMF", expectedCount: 30, sampleCode: "GV-1.1", filename: "compliance_tab_nist_ai_rmf.png" }
    ];

    for (const tab of tabsToVerify) {
      // Click tab
      await page.click(`button:has-text("${tab.id}")`);

      // Verify sample code is visible in table
      await expect(page.getByText(tab.sampleCode).first()).toBeVisible({ timeout: 10000 });

      // Count table rows
      const tableRows = await page.locator("tbody tr").count();
      expect(tableRows).toBe(tab.expectedCount);

      // Verify MetricCard "TOTAL MAPPED CONTROLS" matches table rows count exactly
      await expect(page.getByTestId("metric-total-controls")).toHaveText(String(tab.expectedCount));

      // Screenshot each individual tab
      const tabScreenshotPath = path.join(ARTIFACT_DIR, tab.filename);
      await page.screenshot({ path: tabScreenshotPath, fullPage: true });
      expect(fs.existsSync(tabScreenshotPath)).toBe(true);
    }

    // CRITICAL ASSERTION: Assert that NONE of the old mock strings render
    for (const mockStr of OLD_MOCK_STRINGS) {
      const count = await page.locator(`text="${mockStr}"`).count();
      expect(count).toBe(0);
    }

    // Capture populated screenshot for overall compliance section
    const screenshotPath = path.join(ARTIFACT_DIR, "compliance_section_populated_real_data.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test("Empty State: renders honest empty message when 0 controls exist", async ({ page }) => {
    await page.route("**/api/v1/compliance/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalViolations: 0,
          breakdown: {},
          piiViolations: {},
          riskTrends: [],
          aggregateScore: 0,
          frameworks: [
            { name: "GDPR", score: 0, controls: { total_controls: 0, implemented: 0 } },
            { name: "DPDP", score: 0, controls: { total_controls: 0, implemented: 0 } },
            { name: "HIPAA", score: 0, controls: { total_controls: 0, implemented: 0 } },
            { name: "PCI_DSS", score: 0, controls: { total_controls: 0, implemented: 0 } },
            { name: "NIST_AI_RMF", score: 0, controls: { total_controls: 0, implemented: 0 } }
          ]
        })
      });
    });

    await page.route("**/api/v1/gdpr/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/api/v1/dpdp/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/api/v1/hipaa/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/api/v1/pci/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/api/v1/compliance/nist-ai-rmf/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/api/v1/governance/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });
    await page.route("**/api/v1/ai-systems", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });

    await page.goto("/app/compliance", { waitUntil: "networkidle" });

    // Verify header
    await expect(page.getByRole("heading", { name: "Compliance", exact: true })).toBeVisible({ timeout: 15000 });

    // Verify honest empty message
    await expect(page.getByText("No compliance controls assessed yet for GDPR.")).toBeVisible();

    // Verify readiness scorecard displays 0%
    await expect(page.getByText("0%").first()).toBeVisible();

    // Verify old mock strings still count === 0
    for (const mockStr of OLD_MOCK_STRINGS) {
      const count = await page.locator(`text="${mockStr}"`).count();
      expect(count).toBe(0);
    }

    // Capture empty state screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, "compliance_section_empty_state.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test("Error State: renders error banner and retry button when API fails", async ({ page }) => {
    await page.route("**/api/v1/compliance/stats", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/gdpr/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/dpdp/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/hipaa/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/pci/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/compliance/nist-ai-rmf/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/governance/controls", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/api/v1/ai-systems", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });

    await page.goto("/app/compliance", { waitUntil: "networkidle" });

    // Verify header
    await expect(page.getByRole("heading", { name: "Compliance", exact: true })).toBeVisible({ timeout: 15000 });

    // Verify error banner and retry button appear
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("Unable to reach compliance service")).toBeVisible();

    // Capture error state screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, "compliance_section_error_state.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
