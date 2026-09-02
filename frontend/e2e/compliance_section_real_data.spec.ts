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

export function mapRawControlToItem(c: any, totalAgents: number) {
  const targetFw = mapFrameworkId(c.framework);
  if (!targetFw) return null;

  const implStatus = c.control_implementations?.[0]?.status || c.status;
  return {
    id: c.id || c.control_id || Math.random().toString(),
    code: c.control_id || c.code || c.articleNumber || "CTRL",
    title: c.title || "Untitled Control",
    category: c.category || "Governance",
    status: mapControlStatus(implStatus),
    mappedAgents: totalAgents > 0 ? totalAgents : 0,
    framework: targetFw
  };
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

  const REAL_GOVERNANCE_CONTROLS = {
    items: [
      {
        id: "ctrl-gdpr-1",
        control_id: "GDPR-ART-5",
        title: "Principles of Processing & Minimisation",
        category: "PRINCIPLES",
        framework: "GDPR",
        control_implementations: [{ status: "IMPLEMENTED" }]
      },
      {
        id: "ctrl-gdpr-2",
        control_id: "GDPR-ART-6",
        title: "Lawfulness of Processing & Consent",
        category: "CONSENT",
        framework: "GDPR",
        control_implementations: [{ status: "IMPLEMENTED" }]
      },
      {
        id: "ctrl-dpdp-1",
        control_id: "DPDP-SEC-4",
        title: "Grounds for Processing Personal Data",
        category: "LAWFUL_BASIS",
        framework: "DPDP",
        control_implementations: [{ status: "IMPLEMENTED" }]
      },
      {
        id: "ctrl-hipaa-1",
        control_id: "HIPAA-164-308",
        title: "Security Management & Risk Analysis",
        category: "ADMINISTRATIVE",
        framework: "HIPAA",
        control_implementations: [{ status: "IMPLEMENTED" }]
      },
      {
        id: "ctrl-pci-1",
        control_id: "PCI-REQ-3-4",
        title: "Primary Account Number (PAN) Encryption",
        category: "DATA_PROTECTION",
        framework: "PCI_DSS",
        control_implementations: [{ status: "IMPLEMENTED" }]
      },
      {
        id: "ctrl-nist-1",
        control_id: "NIST-GOV-1",
        title: "Establish Governance Policies",
        category: "GOVERN",
        framework: "NIST_AI_RMF",
        control_implementations: [{ status: "IMPLEMENTED" }]
      }
    ]
  };

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

  test("Populated State: renders real compliance data and never renders old mock strings", async ({ page }) => {
    await page.route("**/api/v1/compliance/stats", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_COMPLIANCE_STATS) });
    });

    await page.route("**/api/v1/governance/controls", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_GOVERNANCE_CONTROLS) });
    });

    await page.route("**/api/v1/ai-systems", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REAL_AI_SYSTEMS) });
    });

    await page.goto("/app/compliance", { waitUntil: "networkidle" });

    // Verify header
    await expect(page.getByRole("heading", { name: "Compliance", exact: true })).toBeVisible({ timeout: 15000 });

    // Verify readiness scores render
    await expect(page.getByText("95%").first()).toBeVisible();

    // Verify real GDPR controls render in table
    await expect(page.getByText("GDPR-ART-5")).toBeVisible();
    await expect(page.getByText("Principles of Processing & Minimisation")).toBeVisible();
    await expect(page.getByText("GDPR-ART-6")).toBeVisible();
    await expect(page.getByText("Lawfulness of Processing & Consent")).toBeVisible();

    // Verify dynamic mapped agents count (3 agents from /ai-systems)
    await expect(page.getByText("3 Agents").first()).toBeVisible();

    // Switch to DPDP tab
    await page.click("button:has-text(\"DPDP\")");
    await expect(page.getByText("DPDP-SEC-4")).toBeVisible();
    await expect(page.getByText("Grounds for Processing Personal Data")).toBeVisible();

    // Switch to HIPAA tab
    await page.click("button:has-text(\"HIPAA\")");
    await expect(page.getByText("HIPAA-164-308")).toBeVisible();
    await expect(page.getByText("Security Management & Risk Analysis")).toBeVisible();

    // Switch to PCI-DSS tab (verifies normalization between PCI-DSS and PCI_DSS)
    await page.click("button:has-text(\"PCI-DSS\")");
    await expect(page.getByText("PCI-REQ-3-4")).toBeVisible();
    await expect(page.getByText("Primary Account Number (PAN) Encryption")).toBeVisible();

    // Switch to NIST AI RMF tab (verifies normalization between NIST AI RMF and NIST_AI_RMF)
    await page.click("button:has-text(\"NIST AI RMF\")");
    await expect(page.getByText("NIST-GOV-1")).toBeVisible();
    await expect(page.getByText("Establish Governance Policies")).toBeVisible();

    // CRITICAL ASSERTION: Assert that NONE of the old mock strings render
    for (const mockStr of OLD_MOCK_STRINGS) {
      const count = await page.locator(`text="${mockStr}"`).count();
      expect(count).toBe(0);
    }

    // Capture populated screenshot
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
