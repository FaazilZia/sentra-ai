import fs from 'fs';
import path from 'path';
import { PIIScannerService } from '../services/piiScanner.service';
import { GuardrailService } from '../services/guardrail.service';
import { makeDecision } from '../services/decisionEngine';
import { evaluateRisk } from '../services/riskEngine';
import { evaluatePolicy } from '../services/policyEngine';

async function analyzeFalsePositives() {
  const jsonPath = path.resolve(__dirname, '../../../tests/pii-benchmark/results/latest-report.json');
  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const fpCases = report.details.filter((d: any) => d.category === 'clean' && d.resultType === 'FP');

  const results: any[] = [];

  for (const c of fpCases) {
    const text = c.input;
    const engines: string[] = [];
    const matchedRules: string[] = [];

    // 1. Check PIIScannerService
    const scanRes = PIIScannerService.scanPayload(text, {});
    if (scanRes.piiDetected) {
      engines.push('PIIScannerService');
      matchedRules.push(`PIIScanner:[${scanRes.detectedCategories.join(', ')}]`);
    }

    // 2. Check GuardrailService
    const guardrailRes = await GuardrailService.evaluateInput(text);
    if (guardrailRes.decision === 'BLOCK' || guardrailRes.decision === 'MODIFY') {
      engines.push('GuardrailService');
      matchedRules.push(`Guardrail:[${guardrailRes.policy_triggered || guardrailRes.reason}]`);
    }

    // 3. Check DecisionEngine / Policy / RiskEngine
    const decisionRes = await makeDecision(`agent-${c.id}`, text, `org-${c.id}`, {});
    if (decisionRes.status === 'blocked' || decisionRes.status === 'flagged' || decisionRes.risk === 'high') {
      engines.push('DecisionEngine');
      
      const policyRes = await evaluatePolicy(`agent-${c.id}`, text, `org-${c.id}`, {});
      const riskRes = evaluateRisk(text, {});

      const triggers: string[] = [];
      if (!policyRes.allowed) {
        triggers.push(`Policy:${policyRes.reason}`);
      }

      const lowercase = text.toLowerCase();
      const keywords = [
        'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card', 'api_key', 'token',
        'medical', 'financial', 'audit', 'payment', 'revenue', 'private', 'message', 'email', 'phone', 'address',
        'proxy', 'scrape', 'manipulate', 'elderly', 'targeting', 'aws', 'key', 'master'
      ];
      const matchedKeywords = keywords.filter(k => lowercase.includes(k));

      const highRiskActions = [
        'export_csv', 'delete_record', 'external_share', 'bypass_auth',
        'export_data', 'master_key', 'admin_access', 'pii_export', 'security_bypass', 'jailbreak', 'unfiltered',
        'delete_all', 'drop_table', 'truncate_table'
      ];
      const matchedHighRisk = highRiskActions.filter(a => lowercase.includes(a));

      const mediumRiskActions = [
        'read_database', 'read_pii', 'access_logs', 'modify_record'
      ];
      const matchedMediumRisk = mediumRiskActions.filter(a => lowercase.includes(a));

      if (matchedKeywords.length > 0) triggers.push(`RiskKeyword:[${matchedKeywords.join(', ')}]`);
      if (matchedHighRisk.length > 0) triggers.push(`HighRiskAction:[${matchedHighRisk.join(', ')}]`);
      if (matchedMediumRisk.length > 0) triggers.push(`MediumRiskAction:[${matchedMediumRisk.join(', ')}]`);
      if (riskRes.triggers.length > 0) triggers.push(`RiskTriggers:[${riskRes.triggers.join(', ')}]`);
      if (riskRes.score === 'high') triggers.push(`RiskScore:HIGH`);

      matchedRules.push(`DecisionEngine(${triggers.join('; ') || decisionRes.reason})`);
    }

    results.push({
      id: c.id,
      input: text,
      engines: engines.join(', '),
      matchedRules: matchedRules.join(' | ')
    });
  }

  // Print as Markdown Table
  console.log(`| # | Case ID | Exact Input Text | Flagging Engine(s) | Specific Matched Rule / Keyword / Trigger |`);
  console.log(`| :--- | :--- | :--- | :--- | :--- |`);
  results.forEach((r, idx) => {
    console.log(`| ${idx + 1} | \`${r.id}\` | "${r.input}" | \`${r.engines}\` | \`${r.matchedRules}\` |`);
  });

  process.exit(0);
}

analyzeFalsePositives().catch(console.error);
