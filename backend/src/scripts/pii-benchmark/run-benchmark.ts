import fs from 'fs';
import path from 'path';
import { PIIScannerService } from '../../services/piiScanner.service';
import { GuardrailService } from '../../services/guardrail.service';
import { makeDecision } from '../../services/decisionEngine';

export interface TestCase {
  id: string;
  input: string;
  shouldFlag: boolean;
  piiType: string;
  framework: string[];
  category: 'direct' | 'clean' | 'obfuscated' | 'adversarial';
}

export interface MetricStats {
  total: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  fnr: number;
}

export interface DetailedResultCase {
  id: string;
  input: string;
  shouldFlag: boolean;
  piiType: string;
  framework: string[];
  category: string;
  detected: boolean;
  resultType: 'TP' | 'FP' | 'TN' | 'FN';
  scannerDetected: boolean;
  guardrailDecision: string;
  decisionStatus: string;
  detectedCategories: string[];
  violatedFrameworks: string[];
}

export interface BenchmarkReport {
  timestamp: string;
  l3Evaluated: boolean;
  caveatNotice: string;
  overall: MetricStats;
  byCategory: Record<string, MetricStats>;
  byPiiType: Record<string, MetricStats>;
  byFramework: Record<string, MetricStats>;
  byEngine: {
    piiScanner: MetricStats;
    guardrailService: MetricStats;
    decisionEngine: MetricStats;
    combinedPipeline: MetricStats;
  };
  worstPerformingCategories: {
    category: string;
    worstMetric: string;
    score: number;
  }[];
  details: DetailedResultCase[];
}

function calculateMetrics(tp: number, fp: number, tn: number, fn: number): MetricStats {
  const total = tp + fp + tn + fn;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 1.0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 1.0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
  const fpr = (fp + tn) > 0 ? fp / (fp + tn) : 0.0;
  const fnr = (fn + tp) > 0 ? fn / (fn + tp) : 0.0;

  return {
    total,
    tp,
    fp,
    tn,
    fn,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    fpr: Number(fpr.toFixed(4)),
    fnr: Number(fnr.toFixed(4)),
  };
}

async function runBenchmark() {
  const DATASET_PATH = path.resolve(__dirname, '../../../../tests/pii-benchmark/dataset.json');
  const RESULTS_DIR = path.resolve(__dirname, '../../../../tests/pii-benchmark/results');
  const JSON_REPORT_PATH = path.join(RESULTS_DIR, 'latest-report.json');
  const MD_REPORT_PATH = path.join(RESULTS_DIR, 'latest-report.md');

  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`Dataset not found at ${DATASET_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const rawData = fs.readFileSync(DATASET_PATH, 'utf-8');
  const dataset: TestCase[] = JSON.parse(rawData);

  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const l3Evaluated = Boolean(apiKey && apiKey.length > 10);
  const caveatNotice = l3Evaluated
    ? 'L3 Semantic Layer active (Anthropic API configured).'
    : 'L1/L2 pattern-matching only, L3 semantic layer not evaluated';

  console.log('===============================================================');
  console.log('        SENTRA AI — PII DETECTION SCORING HARNESS             ');
  console.log('===============================================================');
  console.log(`Dataset Path: ${DATASET_PATH}`);
  console.log(`Total Test Cases: ${dataset.length}`);
  console.log(`L3 Status: ${caveatNotice}`);
  console.log('---------------------------------------------------------------\n');

  const detailedResults: DetailedResultCase[] = [];

  // Group accumulators for Combined Pipeline
  let pipelineTP = 0, pipelineFP = 0, pipelineTN = 0, pipelineFN = 0;

  // Engine accumulators
  let scannerTP = 0, scannerFP = 0, scannerTN = 0, scannerFN = 0;
  let guardrailTP = 0, guardrailFP = 0, guardrailTN = 0, guardrailFN = 0;
  let decisionEngineTP = 0, decisionEngineFP = 0, decisionEngineTN = 0, decisionEngineFN = 0;

  // Breakdown accumulators
  const categoryAcc: Record<string, { tp: number; fp: number; tn: number; fn: number }> = {};
  const piiTypeAcc: Record<string, { tp: number; fp: number; tn: number; fn: number }> = {};
  const frameworkAcc: Record<string, { tp: number; fp: number; tn: number; fn: number }> = {};

  for (const tc of dataset) {
    // 1. Run PIIScannerService
    const scanResult = PIIScannerService.scanPayload(tc.input, {});
    const scannerFlagged = scanResult.piiDetected;

    // 2. Run GuardrailService
    const guardrailResult = await GuardrailService.evaluateInput(tc.input);
    const guardrailFlagged = guardrailResult.decision === 'BLOCK' || guardrailResult.decision === 'MODIFY';

    // 3. Run DecisionEngine with isolated session identity per test case
    const decisionResult = await makeDecision(`agent-${tc.id}`, tc.input, `org-${tc.id}`, {});
    const decisionFlagged = decisionResult.status === 'blocked' || decisionResult.status === 'flagged' || decisionResult.risk === 'high';

    // Combined Pipeline Decision
    const combinedFlagged = scannerFlagged || guardrailFlagged || decisionFlagged;

    // Evaluate Combined Pipeline result type
    let resultType: 'TP' | 'FP' | 'TN' | 'FN';
    if (tc.shouldFlag && combinedFlagged) {
      resultType = 'TP';
      pipelineTP++;
    } else if (!tc.shouldFlag && combinedFlagged) {
      resultType = 'FP';
      pipelineFP++;
    } else if (!tc.shouldFlag && !combinedFlagged) {
      resultType = 'TN';
      pipelineTN++;
    } else {
      resultType = 'FN';
      pipelineFN++;
    }

    // Accumulate for PIIScannerService
    if (tc.shouldFlag && scannerFlagged) scannerTP++;
    else if (!tc.shouldFlag && scannerFlagged) scannerFP++;
    else if (!tc.shouldFlag && !scannerFlagged) scannerTN++;
    else scannerFN++;

    // Accumulate for GuardrailService
    if (tc.shouldFlag && guardrailFlagged) guardrailTP++;
    else if (!tc.shouldFlag && guardrailFlagged) guardrailFP++;
    else if (!tc.shouldFlag && !guardrailFlagged) guardrailTN++;
    else guardrailFN++;

    // Accumulate for DecisionEngine
    if (tc.shouldFlag && decisionFlagged) decisionEngineTP++;
    else if (!tc.shouldFlag && decisionFlagged) decisionEngineFP++;
    else if (!tc.shouldFlag && !decisionFlagged) decisionEngineTN++;
    else decisionEngineFN++;

    // Category accumulators
    if (!categoryAcc[tc.category]) categoryAcc[tc.category] = { tp: 0, fp: 0, tn: 0, fn: 0 };
    if (resultType === 'TP') categoryAcc[tc.category].tp++;
    else if (resultType === 'FP') categoryAcc[tc.category].fp++;
    else if (resultType === 'TN') categoryAcc[tc.category].tn++;
    else categoryAcc[tc.category].fn++;

    // PII Type accumulators
    if (!piiTypeAcc[tc.piiType]) piiTypeAcc[tc.piiType] = { tp: 0, fp: 0, tn: 0, fn: 0 };
    if (resultType === 'TP') piiTypeAcc[tc.piiType].tp++;
    else if (resultType === 'FP') piiTypeAcc[tc.piiType].fp++;
    else if (resultType === 'TN') piiTypeAcc[tc.piiType].tn++;
    else piiTypeAcc[tc.piiType].fn++;

    // Framework accumulators
    if (tc.framework.length === 0) {
      const fwKey = 'NONE';
      if (!frameworkAcc[fwKey]) frameworkAcc[fwKey] = { tp: 0, fp: 0, tn: 0, fn: 0 };
      if (resultType === 'TP') frameworkAcc[fwKey].tp++;
      else if (resultType === 'FP') frameworkAcc[fwKey].fp++;
      else if (resultType === 'TN') frameworkAcc[fwKey].tn++;
      else frameworkAcc[fwKey].fn++;
    } else {
      for (const fw of tc.framework) {
        if (!frameworkAcc[fw]) frameworkAcc[fw] = { tp: 0, fp: 0, tn: 0, fn: 0 };
        if (resultType === 'TP') frameworkAcc[fw].tp++;
        else if (resultType === 'FP') frameworkAcc[fw].fp++;
        else if (resultType === 'TN') frameworkAcc[fw].tn++;
        else frameworkAcc[fw].fn++;
      }
    }

    detailedResults.push({
      id: tc.id,
      input: tc.input,
      shouldFlag: tc.shouldFlag,
      piiType: tc.piiType,
      framework: tc.framework,
      category: tc.category,
      detected: combinedFlagged,
      resultType,
      scannerDetected: scannerFlagged,
      guardrailDecision: guardrailResult.decision,
      decisionStatus: decisionResult.status,
      detectedCategories: scanResult.detectedCategories,
      violatedFrameworks: scanResult.violatedFrameworks,
    });
  }

  // Compute Overall Metrics
  const overallMetrics = calculateMetrics(pipelineTP, pipelineFP, pipelineTN, pipelineFN);

  // Compute Engine Metrics
  const engineMetrics = {
    piiScanner: calculateMetrics(scannerTP, scannerFP, scannerTN, scannerFN),
    guardrailService: calculateMetrics(guardrailTP, guardrailFP, guardrailTN, guardrailFN),
    decisionEngine: calculateMetrics(decisionEngineTP, decisionEngineFP, decisionEngineTN, decisionEngineFN),
    combinedPipeline: overallMetrics,
  };

  // Compute Breakdown Metrics
  const byCategoryMetrics: Record<string, MetricStats> = {};
  for (const [cat, acc] of Object.entries(categoryAcc)) {
    byCategoryMetrics[cat] = calculateMetrics(acc.tp, acc.fp, acc.tn, acc.fn);
  }

  const byPiiTypeMetrics: Record<string, MetricStats> = {};
  for (const [pt, acc] of Object.entries(piiTypeAcc)) {
    byPiiTypeMetrics[pt] = calculateMetrics(acc.tp, acc.fp, acc.tn, acc.fn);
  }

  const byFrameworkMetrics: Record<string, MetricStats> = {};
  for (const [fw, acc] of Object.entries(frameworkAcc)) {
    byFrameworkMetrics[fw] = calculateMetrics(acc.tp, acc.fp, acc.tn, acc.fn);
  }

  // Identify worst performing categories / piiTypes
  const worstPerforming: { category: string; worstMetric: string; score: number }[] = [];
  for (const [cat, m] of Object.entries(byCategoryMetrics)) {
    if (m.f1 < 0.8) {
      worstPerforming.push({ category: `category:${cat}`, worstMetric: 'F1 Score', score: m.f1 });
    }
  }
  for (const [pt, m] of Object.entries(byPiiTypeMetrics)) {
    if (pt !== 'clean' && m.recall < 0.8) {
      worstPerforming.push({ category: `piiType:${pt}`, worstMetric: 'Recall', score: m.recall });
    }
  }

  worstPerforming.sort((a, b) => a.score - b.score);

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    l3Evaluated,
    caveatNotice,
    overall: overallMetrics,
    byCategory: byCategoryMetrics,
    byPiiType: byPiiTypeMetrics,
    byFramework: byFrameworkMetrics,
    byEngine: engineMetrics,
    worstPerformingCategories: worstPerforming,
    details: detailedResults,
  };

  // Save JSON report
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  // Build Markdown Summary
  const mdContent = generateMarkdownReport(report);
  fs.writeFileSync(MD_REPORT_PATH, mdContent, 'utf-8');

  // Console Output
  console.log(`[CAVEAT] ${caveatNotice}\n`);
  console.log('=== OVERALL METRICS ===');
  console.log(`Total Cases: ${overallMetrics.total}`);
  console.log(`Precision:   ${(overallMetrics.precision * 100).toFixed(2)}% (${overallMetrics.tp}/${overallMetrics.tp + overallMetrics.fp})`);
  console.log(`Recall:      ${(overallMetrics.recall * 100).toFixed(2)}% (${overallMetrics.tp}/${overallMetrics.tp + overallMetrics.fn})`);
  console.log(`F1 Score:    ${(overallMetrics.f1 * 100).toFixed(2)}%`);
  console.log(`FP Rate:     ${(overallMetrics.fpr * 100).toFixed(2)}% (${overallMetrics.fp}/${overallMetrics.fp + overallMetrics.tn})`);
  console.log(`FN Rate:     ${(overallMetrics.fnr * 100).toFixed(2)}% (${overallMetrics.fn}/${overallMetrics.fn + overallMetrics.tp})\n`);

  console.log(mdContent);
  console.log(`\nReports saved:`);
  console.log(` - JSON: ${JSON_REPORT_PATH}`);
  console.log(` - MD:   ${MD_REPORT_PATH}`);

  process.exit(0);
}

function generateMarkdownReport(report: BenchmarkReport): string {
  const { overall, byCategory, byPiiType, byFramework, byEngine, caveatNotice } = report;

  let md = `# PII Detection Precision / Recall Benchmark Report\n\n`;
  md += `> [!WARNING]\n`;
  md += `> **Evaluation Mode Notice**: ${caveatNotice}\n\n`;

  md += `## 1. Overall Performance Summary\n\n`;
  md += `| Metric | Value | Breakdown (Count) |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Total Test Cases** | \`${overall.total}\` | Total Dataset Cases |\n`;
  md += `| **Precision** | **${(overall.precision * 100).toFixed(2)}%** | TP: ${overall.tp} / (TP+FP: ${overall.tp + overall.fp}) |\n`;
  md += `| **Recall** | **${(overall.recall * 100).toFixed(2)}%** | TP: ${overall.tp} / (TP+FN: ${overall.tp + overall.fn}) |\n`;
  md += `| **F1 Score** | **${(overall.f1 * 100).toFixed(2)}%** | Harmonic Mean |\n`;
  md += `| **False Positive Rate (FPR)** | **${(overall.fpr * 100).toFixed(2)}%** | FP: ${overall.fp} / (FP+TN: ${overall.fp + overall.tn}) |\n`;
  md += `| **False Negative Rate (FNR)** | **${(overall.fnr * 100).toFixed(2)}%** | FN: ${overall.fn} / (FN+TP: ${overall.fn + overall.tp}) |\n\n`;

  md += `## 2. Layer-by-Layer Engine Performance\n\n`;
  md += `| Engine Layer | Precision | Recall | F1 Score | FPR | FNR |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [engineName, m] of Object.entries(byEngine)) {
    md += `| **${engineName}** | ${(m.precision * 100).toFixed(2)}% | ${(m.recall * 100).toFixed(2)}% | ${(m.f1 * 100).toFixed(2)}% | ${(m.fpr * 100).toFixed(2)}% | ${(m.fnr * 100).toFixed(2)}% |\n`;
  }
  md += `\n`;

  md += `## 3. Breakdown by Category (4-Taxonomy Bucket)\n\n`;
  md += `| Category | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [cat, m] of Object.entries(byCategory)) {
    md += `| **${cat}** | ${m.total} | ${(m.precision * 100).toFixed(2)}% | ${(m.recall * 100).toFixed(2)}% | ${(m.f1 * 100).toFixed(2)}% | ${(m.fpr * 100).toFixed(2)}% | ${(m.fnr * 100).toFixed(2)}% | ${m.tp} | ${m.fp} | ${m.tn} | ${m.fn} |\n`;
  }
  md += `\n`;

  md += `## 4. Breakdown by PII Type\n\n`;
  md += `| PII Type | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [pt, m] of Object.entries(byPiiType)) {
    md += `| **${pt}** | ${m.total} | ${(m.precision * 100).toFixed(2)}% | ${(m.recall * 100).toFixed(2)}% | ${(m.f1 * 100).toFixed(2)}% | ${(m.fpr * 100).toFixed(2)}% | ${(m.fnr * 100).toFixed(2)}% | ${m.tp} | ${m.fp} | ${m.tn} | ${m.fn} |\n`;
  }
  md += `\n`;

  md += `## 5. Breakdown by Framework Compliance\n\n`;
  md += `| Framework | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [fw, m] of Object.entries(byFramework)) {
    md += `| **${fw}** | ${m.total} | ${(m.precision * 100).toFixed(2)}% | ${(m.recall * 100).toFixed(2)}% | ${(m.f1 * 100).toFixed(2)}% | ${(m.fpr * 100).toFixed(2)}% | ${(m.fnr * 100).toFixed(2)}% | ${m.tp} | ${m.fp} | ${m.tn} | ${m.fn} |\n`;
  }
  md += `\n`;

  if (report.worstPerformingCategories.length > 0) {
    md += `## 6. Weakest Categories & Lowest Recall Areas\n\n`;
    for (const w of report.worstPerformingCategories) {
      md += `- **${w.category}**: Lowest ${w.worstMetric} at \`${(w.score * 100).toFixed(2)}%\`\n`;
    }
    md += `\n`;
  }

  return md;
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
