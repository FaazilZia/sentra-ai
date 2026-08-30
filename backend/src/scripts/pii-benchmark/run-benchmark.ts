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

interface CountAcc {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

function createEmptyAcc(): CountAcc {
  return { tp: 0, fp: 0, tn: 0, fn: 0 };
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

function getResultType(shouldFlag: boolean, flagged: boolean): 'TP' | 'FP' | 'TN' | 'FN' {
  if (shouldFlag && flagged) return 'TP';
  if (!shouldFlag && flagged) return 'FP';
  if (!shouldFlag && !flagged) return 'TN';
  return 'FN';
}

function updateAcc(acc: CountAcc, resType: 'TP' | 'FP' | 'TN' | 'FN'): void {
  if (resType === 'TP') acc.tp++;
  else if (resType === 'FP') acc.fp++;
  else if (resType === 'TN') acc.tn++;
  else acc.fn++;
}

async function evaluateSingleCase(tc: TestCase): Promise<{
  scannerFlagged: boolean;
  guardrailFlagged: boolean;
  decisionFlagged: boolean;
  combinedFlagged: boolean;
  resultType: 'TP' | 'FP' | 'TN' | 'FN';
  scanResult: ReturnType<typeof PIIScannerService.scanPayload>;
  guardrailResult: Awaited<ReturnType<typeof GuardrailService.evaluateInput>>;
  decisionResult: Awaited<ReturnType<typeof makeDecision>>;
}> {
  const scanResult = PIIScannerService.scanPayload(tc.input, {});
  const scannerFlagged = scanResult.piiDetected;

  const guardrailResult = await GuardrailService.evaluateInput(tc.input);
  const guardrailFlagged = guardrailResult.decision === 'BLOCK' || guardrailResult.decision === 'MODIFY';

  const decisionResult = await makeDecision(`agent-${tc.id}`, tc.input, `org-${tc.id}`, {});
  const decisionFlagged = decisionResult.status === 'blocked' || decisionResult.status === 'flagged' || decisionResult.risk === 'high';

  const combinedFlagged = scannerFlagged || guardrailFlagged || decisionFlagged;
  const resultType = getResultType(tc.shouldFlag, combinedFlagged);

  return {
    scannerFlagged,
    guardrailFlagged,
    decisionFlagged,
    combinedFlagged,
    resultType,
    scanResult,
    guardrailResult,
    decisionResult,
  };
}

function recordGroupStats(
  targetMap: Record<string, CountAcc>,
  key: string,
  resType: 'TP' | 'FP' | 'TN' | 'FN'
): void {
  if (!targetMap[key]) {
    targetMap[key] = createEmptyAcc();
  }
  updateAcc(targetMap[key], resType);
}

function buildMetricMap(accMap: Record<string, CountAcc>): Record<string, MetricStats> {
  const result: Record<string, MetricStats> = {};
  for (const [key, acc] of Object.entries(accMap)) {
    result[key] = calculateMetrics(acc.tp, acc.fp, acc.tn, acc.fn);
  }
  return result;
}

function renderMarkdownTableSection(title: string, headers: string[], rows: string[][]): string {
  let table = `## ${title}\n\n`;
  table += `| ${headers.join(' | ')} |\n`;
  table += `| ${headers.map((_, i) => (i === 0 ? ':---' : ':---:')).join(' | ')} |\n`;
  for (const row of rows) {
    table += `| ${row.join(' | ')} |\n`;
  }
  return `${table}\n`;
}

function generateMarkdownReport(report: BenchmarkReport): string {
  const { overall, byCategory, byPiiType, byFramework, byEngine, caveatNotice } = report;

  let md = `# PII Detection Precision / Recall Benchmark Report\n\n`;
  md += `> [!WARNING]\n`;
  md += `> **Evaluation Mode Notice**: ${caveatNotice}\n\n`;

  // Section 1: Overall
  md += `## 1. Overall Performance Summary\n\n`;
  md += `| Metric | Value | Breakdown (Count) |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Total Test Cases** | \`${overall.total}\` | Total Dataset Cases |\n`;
  md += `| **Precision** | **${(overall.precision * 100).toFixed(2)}%** | TP: ${overall.tp} / (TP+FP: ${overall.tp + overall.fp}) |\n`;
  md += `| **Recall** | **${(overall.recall * 100).toFixed(2)}%** | TP: ${overall.tp} / (TP+FN: ${overall.tp + overall.fn}) |\n`;
  md += `| **F1 Score** | **${(overall.f1 * 100).toFixed(2)}%** | Harmonic Mean |\n`;
  md += `| **False Positive Rate (FPR)** | **${(overall.fpr * 100).toFixed(2)}%** | FP: ${overall.fp} / (FP+TN: ${overall.fp + overall.tn}) |\n`;
  md += `| **False Negative Rate (FNR)** | **${(overall.fnr * 100).toFixed(2)}%** | FN: ${overall.fn} / (FN+TP: ${overall.fn + overall.tp}) |\n\n`;

  // Section 2: Engines
  const engineRows = Object.entries(byEngine).map(([name, m]) => [
    `**${name}**`,
    `${(m.precision * 100).toFixed(2)}%`,
    `${(m.recall * 100).toFixed(2)}%`,
    `${(m.f1 * 100).toFixed(2)}%`,
    `${(m.fpr * 100).toFixed(2)}%`,
    `${(m.fnr * 100).toFixed(2)}%`,
  ]);
  md += renderMarkdownTableSection(
    '2. Layer-by-Layer Engine Performance',
    ['Engine Layer', 'Precision', 'Recall', 'F1 Score', 'FPR', 'FNR'],
    engineRows
  );

  // Section 3: Categories
  const categoryRows = Object.entries(byCategory).map(([cat, m]) => [
    `**${cat}**`,
    `${m.total}`,
    `${(m.precision * 100).toFixed(2)}%`,
    `${(m.recall * 100).toFixed(2)}%`,
    `${(m.f1 * 100).toFixed(2)}%`,
    `${(m.fpr * 100).toFixed(2)}%`,
    `${(m.fnr * 100).toFixed(2)}%`,
    `${m.tp}`,
    `${m.fp}`,
    `${m.tn}`,
    `${m.fn}`,
  ]);
  md += renderMarkdownTableSection(
    '3. Breakdown by Category (4-Taxonomy Bucket)',
    ['Category', 'Cases', 'Precision', 'Recall', 'F1 Score', 'FPR', 'FNR', 'TP', 'FP', 'TN', 'FN'],
    categoryRows
  );

  // Section 4: PII Types
  const piiRows = Object.entries(byPiiType).map(([pt, m]) => [
    `**${pt}**`,
    `${m.total}`,
    `${(m.precision * 100).toFixed(2)}%`,
    `${(m.recall * 100).toFixed(2)}%`,
    `${(m.f1 * 100).toFixed(2)}%`,
    `${(m.fpr * 100).toFixed(2)}%`,
    `${(m.fnr * 100).toFixed(2)}%`,
    `${m.tp}`,
    `${m.fp}`,
    `${m.tn}`,
    `${m.fn}`,
  ]);
  md += renderMarkdownTableSection(
    '4. Breakdown by PII Type',
    ['PII Type', 'Cases', 'Precision', 'Recall', 'F1 Score', 'FPR', 'FNR', 'TP', 'FP', 'TN', 'FN'],
    piiRows
  );

  // Section 5: Frameworks
  const frameworkRows = Object.entries(byFramework).map(([fw, m]) => [
    `**${fw}**`,
    `${m.total}`,
    `${(m.precision * 100).toFixed(2)}%`,
    `${(m.recall * 100).toFixed(2)}%`,
    `${(m.f1 * 100).toFixed(2)}%`,
    `${(m.fpr * 100).toFixed(2)}%`,
    `${(m.fnr * 100).toFixed(2)}%`,
    `${m.tp}`,
    `${m.fp}`,
    `${m.tn}`,
    `${m.fn}`,
  ]);
  md += renderMarkdownTableSection(
    '5. Breakdown by Framework Compliance',
    ['Framework', 'Cases', 'Precision', 'Recall', 'F1 Score', 'FPR', 'FNR', 'TP', 'FP', 'TN', 'FN'],
    frameworkRows
  );

  if (report.worstPerformingCategories.length > 0) {
    md += `## 6. Weakest Categories & Lowest Recall Areas\n\n`;
    for (const w of report.worstPerformingCategories) {
      md += `- **${w.category}**: Lowest ${w.worstMetric} at \`${(w.score * 100).toFixed(2)}%\`\n`;
    }
    md += `\n`;
  }

  return md;
}

function findWeakSpots(
  byCat: Record<string, MetricStats>,
  byType: Record<string, MetricStats>
): { category: string; worstMetric: string; score: number }[] {
  const weak: { category: string; worstMetric: string; score: number }[] = [];
  for (const [cat, m] of Object.entries(byCat)) {
    if (m.f1 < 0.8) {
      weak.push({ category: `category:${cat}`, worstMetric: 'F1 Score', score: m.f1 });
    }
  }
  for (const [pt, m] of Object.entries(byType)) {
    if (pt !== 'clean' && m.recall < 0.8) {
      weak.push({ category: `piiType:${pt}`, worstMetric: 'Recall', score: m.recall });
    }
  }
  weak.sort((a, b) => a.score - b.score);
  return weak;
}

async function runBenchmark() {
  const DATASET_PATH = path.resolve(__dirname, '../../../../tests/pii-benchmark/dataset.json');
  const RESULTS_DIR = path.resolve(__dirname, '../../../../tests/pii-benchmark/results');
  const JSON_REPORT_PATH = path.join(RESULTS_DIR, 'latest-report.json');
  const MD_REPORT_PATH = path.join(RESULTS_DIR, 'latest-report.md');

  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset not found at ${DATASET_PATH}`);
  }
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const dataset: TestCase[] = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const l3Evaluated = Boolean(apiKey && apiKey.length > 10);
  const caveatNotice = l3Evaluated
    ? 'L3 Semantic Layer active (Anthropic API configured).'
    : 'L1/L2 pattern-matching only, L3 semantic layer not evaluated';

  const pipelineAcc = createEmptyAcc();
  const scannerAcc = createEmptyAcc();
  const guardrailAcc = createEmptyAcc();
  const decisionEngineAcc = createEmptyAcc();

  const categoryAcc: Record<string, CountAcc> = {};
  const piiTypeAcc: Record<string, CountAcc> = {};
  const frameworkAcc: Record<string, CountAcc> = {};

  const detailedResults: DetailedResultCase[] = [];

  for (const tc of dataset) {
    const res = await evaluateSingleCase(tc);

    updateAcc(pipelineAcc, res.resultType);
    updateAcc(scannerAcc, getResultType(tc.shouldFlag, res.scannerFlagged));
    updateAcc(guardrailAcc, getResultType(tc.shouldFlag, res.guardrailFlagged));
    updateAcc(decisionEngineAcc, getResultType(tc.shouldFlag, res.decisionFlagged));

    recordGroupStats(categoryAcc, tc.category, res.resultType);
    recordGroupStats(piiTypeAcc, tc.piiType, res.resultType);

    const frameworks = tc.framework.length === 0 ? ['NONE'] : tc.framework;
    for (const fw of frameworks) {
      recordGroupStats(frameworkAcc, fw, res.resultType);
    }

    detailedResults.push({
      id: tc.id,
      input: tc.input,
      shouldFlag: tc.shouldFlag,
      piiType: tc.piiType,
      framework: tc.framework,
      category: tc.category,
      detected: res.combinedFlagged,
      resultType: res.resultType,
      scannerDetected: res.scannerFlagged,
      guardrailDecision: res.guardrailResult.decision,
      decisionStatus: res.decisionResult.status,
      detectedCategories: res.scanResult.detectedCategories,
      violatedFrameworks: res.scanResult.violatedFrameworks,
    });
  }

  const overallMetrics = calculateMetrics(pipelineAcc.tp, pipelineAcc.fp, pipelineAcc.tn, pipelineAcc.fn);
  const byCategoryMetrics = buildMetricMap(categoryAcc);
  const byPiiTypeMetrics = buildMetricMap(piiTypeAcc);
  const byFrameworkMetrics = buildMetricMap(frameworkAcc);

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    l3Evaluated,
    caveatNotice,
    overall: overallMetrics,
    byCategory: byCategoryMetrics,
    byPiiType: byPiiTypeMetrics,
    byFramework: byFrameworkMetrics,
    byEngine: {
      piiScanner: calculateMetrics(scannerAcc.tp, scannerAcc.fp, scannerAcc.tn, scannerAcc.fn),
      guardrailService: calculateMetrics(guardrailAcc.tp, guardrailAcc.fp, guardrailAcc.tn, guardrailAcc.fn),
      decisionEngine: calculateMetrics(decisionEngineAcc.tp, decisionEngineAcc.fp, decisionEngineAcc.tn, decisionEngineAcc.fn),
      combinedPipeline: overallMetrics,
    },
    worstPerformingCategories: findWeakSpots(byCategoryMetrics, byPiiTypeMetrics),
    details: detailedResults,
  };

  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  const mdContent = generateMarkdownReport(report);
  fs.writeFileSync(MD_REPORT_PATH, mdContent, 'utf-8');

  console.log(`[CAVEAT] ${caveatNotice}\n`);
  console.log('=== OVERALL METRICS ===');
  console.log(`Total Cases: ${overallMetrics.total}`);
  console.log(`Precision:   ${(overallMetrics.precision * 100).toFixed(2)}% (${overallMetrics.tp}/${overallMetrics.tp + overallMetrics.fp})`);
  console.log(`Recall:      ${(overallMetrics.recall * 100).toFixed(2)}% (${overallMetrics.tp}/${overallMetrics.tp + overallMetrics.fn})`);
  console.log(`F1 Score:    ${(overallMetrics.f1 * 100).toFixed(2)}%`);
  console.log(`FP Rate:     ${(overallMetrics.fpr * 100).toFixed(2)}% (${overallMetrics.fp}/${overallMetrics.fp + overallMetrics.tn})`);
  console.log(`FN Rate:     ${(overallMetrics.fnr * 100).toFixed(2)}% (${overallMetrics.fn}/${overallMetrics.fn + overallMetrics.tp})\n`);

  console.log(mdContent);
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exitCode = 1;
});
