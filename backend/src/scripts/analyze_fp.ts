import fs from 'fs';
import path from 'path';
import { PIIScannerService } from '../services/piiScanner.service';
import { GuardrailService } from '../services/guardrail.service';
import { makeDecision } from '../services/decisionEngine';
import { evaluateRisk } from '../services/riskEngine';
import { evaluatePolicy } from '../services/policyEngine';

interface ReportDetail {
  id: string;
  input: string;
  category: string;
  resultType: string;
}

interface AnalyzedResult {
  id: string;
  input: string;
  engines: string;
  matchedRules: string;
}

const KEYWORDS = [
  'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card', 'api_key', 'token',
  'medical', 'financial', 'audit', 'payment', 'revenue', 'private', 'message', 'email', 'phone', 'address',
  'proxy', 'scrape', 'manipulate', 'elderly', 'targeting', 'aws', 'key', 'master'
];

const HIGH_RISK_ACTIONS = [
  'export_csv', 'delete_record', 'external_share', 'bypass_auth',
  'export_data', 'master_key', 'admin_access', 'pii_export', 'security_bypass', 'jailbreak', 'unfiltered',
  'delete_all', 'drop_table', 'truncate_table'
];

const MEDIUM_RISK_ACTIONS = [
  'read_database', 'read_pii', 'access_logs', 'modify_record'
];

function findMatches(textLower: string, list: string[]): string[] {
  return list.filter((item) => textLower.includes(item));
}

async function analyzeDecisionTriggers(id: string, text: string): Promise<string[]> {
  const policyRes = await evaluatePolicy(`agent-${id}`, text, `org-${id}`, {});
  const riskRes = evaluateRisk(text, {});
  const textLower = text.toLowerCase();

  const triggers: string[] = [];
  if (!policyRes.allowed) {
    triggers.push(`Policy:${policyRes.reason}`);
  }

  const matchedKeywords = findMatches(textLower, KEYWORDS);
  const matchedHighRisk = findMatches(textLower, HIGH_RISK_ACTIONS);
  const matchedMediumRisk = findMatches(textLower, MEDIUM_RISK_ACTIONS);

  if (matchedKeywords.length > 0) triggers.push(`RiskKeyword:[${matchedKeywords.join(', ')}]`);
  if (matchedHighRisk.length > 0) triggers.push(`HighRiskAction:[${matchedHighRisk.join(', ')}]`);
  if (matchedMediumRisk.length > 0) triggers.push(`MediumRiskAction:[${matchedMediumRisk.join(', ')}]`);
  if (riskRes.triggers.length > 0) triggers.push(`RiskTriggers:[${riskRes.triggers.join(', ')}]`);
  if (riskRes.score === 'high') triggers.push(`RiskScore:HIGH`);

  return triggers;
}

async function analyzeCase(c: ReportDetail): Promise<AnalyzedResult> {
  const text = c.input;
  const engines: string[] = [];
  const matchedRules: string[] = [];

  const scanRes = PIIScannerService.scanPayload(text, {});
  if (scanRes.piiDetected) {
    engines.push('PIIScannerService');
    matchedRules.push(`PIIScanner:[${scanRes.detectedCategories.join(', ')}]`);
  }

  const guardrailRes = await GuardrailService.evaluateInput(text);
  if (guardrailRes.decision === 'BLOCK' || guardrailRes.decision === 'MODIFY') {
    engines.push('GuardrailService');
    matchedRules.push(`Guardrail:[${guardrailRes.policy_triggered || guardrailRes.reason}]`);
  }

  const decisionRes = await makeDecision(`agent-${c.id}`, text, `org-${c.id}`, {});
  if (decisionRes.status === 'blocked' || decisionRes.status === 'flagged' || decisionRes.risk === 'high') {
    engines.push('DecisionEngine');
    const triggers = await analyzeDecisionTriggers(c.id, text);
    matchedRules.push(`DecisionEngine(${triggers.join('; ') || decisionRes.reason})`);
  }

  return {
    id: c.id,
    input: text,
    engines: engines.join(', '),
    matchedRules: matchedRules.join(' | '),
  };
}

async function analyzeFalsePositives() {
  const jsonPath = path.resolve(__dirname, '../../../tests/pii-benchmark/results/latest-report.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('No latest-report.json found.');
    return;
  }

  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const fpCases: ReportDetail[] = (report.details || []).filter(
    (d: ReportDetail) => d.category === 'clean' && d.resultType === 'FP'
  );

  const results: AnalyzedResult[] = [];
  for (const c of fpCases) {
    results.push(await analyzeCase(c));
  }

  console.log(`| # | Case ID | Exact Input Text | Flagging Engine(s) | Specific Matched Rule / Keyword / Trigger |`);
  console.log(`| :--- | :--- | :--- | :--- | :--- |`);
  results.forEach((r, idx) => {
    console.log(`| ${idx + 1} | \`${r.id}\` | "${r.input}" | \`${r.engines}\` | \`${r.matchedRules}\` |`);
  });
}

analyzeFalsePositives().catch((err) => {
  console.error('Analysis error:', err);
  process.exitCode = 1;
});
