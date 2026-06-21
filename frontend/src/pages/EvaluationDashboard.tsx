import React, { useState, useEffect } from 'react';
import { Play, RefreshCw } from 'lucide-react';

interface GovernanceScore {
  overall: number;
  policyScore: number;
  incidentScore: number;
  driftScore: number;
  evaluationScore: number;
  grade: string;
}

interface EvalRun {
  id: string;
  run_type: string;
  status: string;
  governance_score: number | null;
  safety_score: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  created_at: string;
  completed_at: string | null;
  agent?: { name: string };
  dataset?: { name: string };
}

interface BiasCaseResult {
  id: string;
  input: string;
  expected: 'BLOCKED' | 'ALLOWED';
  actual: 'BLOCKED' | 'ALLOWED';
  passed: boolean;
  bias_dimension: 'GENDER' | 'RACE' | 'AGE' | 'DISABILITY' | 'NONE';
  tags: string[];
  risk_level: string;
  explanation: string;
  flags: string[];
}

interface BiasAuditResult {
  preset: string;
  name: string;
  description: string;
  results: BiasCaseResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    overallBiasRiskScore: number;
  };
}

const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  A: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  B: { color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  D: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  F: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  running: '#3b82f6',
  pending: '#f59e0b',
  failed: '#ef4444',
};

const BIAS_PRESETS = [
  {
    key: 'EU_AI_ACT_BIAS',
    name: 'EU AI Act Bias Preset',
    description: 'Demographic bias measurement and equity auditing per EU AI Act Article 10 guidelines.',
    tags: ['EU AI Act', 'Article 10', 'High-Risk AI']
  },
  {
    key: 'NIST_MS_2_5',
    name: 'NIST Measure 2.5 Bias Preset',
    description: 'Systemic bias measurement and equity auditing test cases per NIST AI RMF MEASURE 2.5.',
    tags: ['NIST AI RMF', 'Measure 2.5', 'Equity Audit']
  },
  {
    key: 'NYC_LL144',
    name: 'NYC LL144 Bias Preset',
    description: 'Bias audits on automated employment decision systems (AEDS) per NYC Local Law 144.',
    tags: ['NYC LL144', 'Recruitment', 'Employment Bias']
  },
  {
    key: 'COLORADO_SB205',
    name: 'Colorado SB205 Bias Preset',
    description: 'Insurance and financial decision bias scenarios per Colorado SB205 guidelines.',
    tags: ['Colorado SB205', 'Financial Bias', 'Insurance Scoring']
  }
];

const EvaluationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'safety' | 'bias'>('safety');
  
  // Safety Benchmark States
  const [score, setScore] = useState<GovernanceScore | null>(null);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);
  const [runResults, setRunResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Bias Audit States
  const [runningBiasPreset, setRunningBiasPreset] = useState<string | null>(null);
  const [biasAuditResult, setBiasAuditResult] = useState<BiasAuditResult | null>(null);

  // Live Model Evaluation States
  const [liveEvalModalOpen, setLiveEvalModalOpen] = useState(false);
  const [liveModel, setLiveModel] = useState('gpt-4o-mini');
  const [liveCategory, setLiveCategory] = useState('PROMPT_INJECTION');
  const [liveApiKey, setLiveApiKey] = useState('');
  const [liveRunning, setLiveRunning] = useState(false);
  const [activePollRunId, setActivePollRunId] = useState<string | null>(null);
  const [liveRunStatus, setLiveRunStatus] = useState<string>('');
  const [liveRunScore, setLiveRunScore] = useState<number | null>(null);
  const [liveRunResults, setLiveRunResults] = useState<any[]>([]);
  const [liveSummary, setLiveSummary] = useState<any>(null);


  useEffect(() => {
    fetchAll();
  }, []);

  // Polling for live evaluation status
  useEffect(() => {
    if (!activePollRunId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/evaluation/runs/${activePollRunId}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          const run = data.data;
          setLiveRunStatus(run.status);
          if (run.status === 'completed') {
            setLiveRunScore(run.governance_score);
            setLiveRunResults(run.results || []);
            
            const metadata = run.metadata || {};
            setLiveSummary(metadata.summary || {
              passed: run.passed_tests,
              failed: run.failed_tests,
              total: run.total_tests,
              model: metadata.model || 'gpt-4o-mini',
              dataset: metadata.dataset || 'Prompt Injection Attacks'
            });
            
            setLiveRunning(false);
            setActivePollRunId(null);
            fetchAll();
            clearInterval(interval);
          } else if (run.status === 'failed') {
            setLiveRunStatus('failed');
            setLiveRunning(false);
            setActivePollRunId(null);
            clearInterval(interval);
            alert('Live evaluation run failed.');
          }
        }
      } catch (err) {
        console.error('Error polling run status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activePollRunId]);

  const handleLiveEvalSubmit = async () => {
    setLiveRunning(true);
    setLiveRunResults([]);
    setLiveRunScore(null);
    setLiveSummary(null);
    setLiveRunStatus('running');
    try {
      const res = await fetch('/api/v1/evaluations/live-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: liveModel,
          datasetCategory: liveCategory,
          apiKey: liveApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePollRunId(data.data.runId);
      } else {
        alert(data.error || 'Failed to start live evaluation');
        setLiveRunning(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Network error occurred');
      setLiveRunning(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [scoreRes, runsRes] = await Promise.all([
        fetch('/api/v1/evaluation/score', { credentials: 'include' }),
        fetch('/api/v1/evaluation/runs?limit=10', { credentials: 'include' }),
      ]);
      const [scoreData, runsData] = await Promise.all([scoreRes.json(), runsRes.json()]);
      if (scoreData.success) setScore(scoreData.data);
      if (runsData.success) { setRuns(runsData.runs); setTotal(runsData.total); }
    } catch (err) {
      console.error('Failed to load evaluation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerEval = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/v1/evaluation/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ runType: 'MANUAL' }),
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(fetchAll, 2000);
      }
    } catch (err) {
      console.error('Failed to trigger evaluation:', err);
    } finally { setTriggering(false); }
  };

  const runBiasAudit = async (presetKey: string) => {
    setRunningBiasPreset(presetKey);
    try {
      const res = await fetch('/api/v1/evaluations/run-bias-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preset: presetKey }),
      });
      const data = await res.json();
      if (data.success) {
        setBiasAuditResult(data.data);
      } else {
        alert(data.message || 'Failed to execute bias audit');
      }
    } catch (err) {
      console.error('Failed to run bias audit:', err);
    } finally {
      setRunningBiasPreset(null);
    }
  };

  const viewResults = async (run: EvalRun) => {
    setSelectedRun(run);
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/v1/evaluation/runs/${run.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRunResults(data.data.results || []);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally { setLoadingResults(false); }
  };

  const gradeStyle = score ? GRADE_COLORS[score.grade] || GRADE_COLORS.F : { color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.1)' };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            🧪 AI Evaluation & Governance
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.875rem' }}>
            Continuous red-teaming, safety scoring, bias detection, and AI governance health
          </p>
        </div>
        
        {activeTab === 'safety' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setLiveEvalModalOpen(true)}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-default)',
                background: 'var(--bg-page)',
                color: 'var(--royal-indigo)', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
            >
              ⚡ Run Live LLM Evaluation
            </button>
            <button
              onClick={triggerEval}
              disabled={triggering}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: triggering ? '#334155' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'var(--text-primary)', fontWeight: 600, cursor: triggering ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem', boxShadow: triggering ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {triggering ? '⟳ Starting...' : '▶ Run Sandbox Evaluation'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: '24px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTab('safety')}
          style={{
            paddingBottom: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'none', border: 'none',
            color: activeTab === 'safety' ? '#6366f1' : '#94a3b8', cursor: 'pointer',
            borderBottom: activeTab === 'safety' ? '2px solid #6366f1' : 'none', transition: 'all 0.15s'
          }}
        >
          📋 Safety & Governance Benchmarks
        </button>
        <button
          onClick={() => setActiveTab('bias')}
          style={{
            paddingBottom: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'none', border: 'none',
            color: activeTab === 'bias' ? '#8b5cf6' : '#94a3b8', cursor: 'pointer',
            borderBottom: activeTab === 'bias' ? '2px solid #8b5cf6' : 'none', transition: 'all 0.15s'
          }}
        >
          ⚖️ Bias Audits & Equity Presets
        </button>
      </div>

      {activeTab === 'safety' ? (
        /* Safety Dashboard tab content */
        <>
          {/* Governance Score Cards */}
          {score && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{
                gridColumn: 'span 1', background: gradeStyle.bg, border: `1px solid ${gradeStyle.color}`,
                borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                boxShadow: `0 0 24px ${gradeStyle.color}22`,
              }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: gradeStyle.color }}>{score.grade}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: gradeStyle.color }}>{score.overall}%</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>Governance Score</div>
              </div>
              {[
                { label: 'Policy Score', value: score.policyScore, icon: '📋' },
                { label: 'Incident Score', value: score.incidentScore, icon: '🚨' },
                { label: 'Drift Score', value: score.driftScore, icon: '📊' },
                { label: 'Eval Score', value: score.evaluationScore, icon: '🧪' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  background: '#ffffff', border: '1px solid var(--border-default)',
                  borderRadius: '16px', padding: '20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{icon}</div>
                  <div style={{
                    fontSize: '1.6rem', fontWeight: 700,
                    color: value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444',
                  }}>{Math.round(value)}%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
                  <div style={{ marginTop: '8px', height: '4px', background: 'var(--bg-page)', borderRadius: '2px' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px', width: `${value}%`,
                      background: value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selectedRun ? '1fr 1fr' : '1fr', gap: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Evaluation Runs ({total})
                </h2>
              </div>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : runs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No evaluation runs yet. Click "Run Evaluation" to start.
                </div>
              ) : runs.map((run) => (
                <div
                  key={run.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => viewResults(run)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viewResults(run); } }}
                  style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer',
                    background: selectedRun?.id === run.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    transition: 'background 0.15s',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        background: `${STATUS_COLORS[run.status]}22`, color: STATUS_COLORS[run.status],
                      }}>{run.status}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{run.run_type}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(run.created_at).toLocaleString()}
                      {run.agent && ` • ${run.agent.name}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {run.governance_score !== null && (
                      <div style={{
                        fontSize: '1.2rem', fontWeight: 700,
                        color: run.governance_score >= 80 ? '#22c55e' : run.governance_score >= 60 ? '#f59e0b' : '#ef4444',
                      }}>{run.governance_score?.toFixed(1)}%</div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {run.passed_tests}/{run.total_tests} passed
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedRun && (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Test Results</h2>
                  <button onClick={() => { setSelectedRun(null); setRunResults([]); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {loadingResults ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading results...</div>
                  ) : runResults.map((result) => (
                    <div key={result.id} style={{
                      padding: '12px 20px', borderBottom: '1px solid var(--border-default)',
                      display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '10px', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '1rem' }}>{result.passed ? '✅' : '❌'}</span>
                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>{result.test_type}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                          {result.input.slice(0, 70)}...
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        background: result.risk_level === 'high' ? 'rgba(239,68,68,0.1)' : result.risk_level === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                        color: result.risk_level === 'high' ? '#ef4444' : result.risk_level === 'medium' ? '#f59e0b' : '#22c55e',
                      }}>{result.risk_level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Bias Dashboard tab content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Preset list grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {BIAS_PRESETS.map(preset => (
              <div 
                key={preset.key}
                style={{
                  background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: '16px',
                  padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {preset.tags.map(t => (
                      <span key={t} style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{preset.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>{preset.description}</p>
                </div>

                <button
                  onClick={() => runBiasAudit(preset.key)}
                  disabled={runningBiasPreset !== null}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none',
                    background: runningBiasPreset === preset.key ? '#334155' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: 'var(--text-primary)', fontWeight: 700, cursor: runningBiasPreset !== null ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 6px rgba(139,92,246,0.2)', transition: 'all 0.2s'
                  }}
                >
                  {runningBiasPreset === preset.key ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Auditing Preset...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run Bias Audit
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Results Panel */}
          {biasAuditResult && (
            <div style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid var(--border-default)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', background: 'rgba(30,41,59,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Audit Results: {biasAuditResult.name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                    Preset audited successfully through high-performance makeDecision sandbox engine.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>{biasAuditResult.summary.passed}/{biasAuditResult.summary.total}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 750 }}>Passed Scenarios</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: biasAuditResult.summary.overallBiasRiskScore > 40 ? '#ef4444' : biasAuditResult.summary.overallBiasRiskScore > 10 ? '#f59e0b' : '#22c55e' }}>
                      {biasAuditResult.summary.overallBiasRiskScore}%
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 750 }}>Bias Deviation Rate</div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', background: 'rgba(15,15,26,0.3)', fontWeight: 700 }}>
                      <th style={{ padding: '16px' }}>Scenario Input</th>
                      <th style={{ padding: '16px' }}>Bias Dimension</th>
                      <th style={{ padding: '16px' }}>Expected Action</th>
                      <th style={{ padding: '16px' }}>Decision Status</th>
                      <th style={{ padding: '16px' }}>Auditor Explanation</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biasAuditResult.results.map((res) => (
                      <tr key={res.id} style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(30,41,59,0.1)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 550, maxWidth: '240px', lineHeight: 1.5 }}>
                          {res.input}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            {res.tags.map(t => (
                              <span key={t} style={{ fontSize: '8px', color: 'var(--text-muted)', background: 'var(--bg-page)', padding: '1px 6px', borderRadius: '4px' }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            background: 'rgba(236,72,153,0.1)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.2)'
                          }}>
                            {res.bias_dimension}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {res.expected}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            background: res.actual === 'BLOCKED' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                            color: res.actual === 'BLOCKED' ? '#ef4444' : '#22c55e'
                          }}>
                            {res.actual}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.4 }}>
                          {res.explanation}
                          {res.flags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                              {res.flags.map((f: string) => (
                                <span key={f} style={{ fontSize: '7px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                            background: res.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: res.passed ? '#22c55e' : '#ef4444',
                            border: res.passed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)'
                          }}>
                            {res.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Live Model Evaluation Modal */}
      {liveEvalModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '560px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                ⚡ Live Model Evaluation Setup
              </h3>
              <button 
                onClick={() => setLiveEvalModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Select LLM Model
              </label>
              <select
                value={liveModel}
                onChange={(e) => setLiveModel(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)',
                  background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                }}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Select Dataset Category
              </label>
              <select
                value={liveCategory}
                onChange={(e) => setLiveCategory(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)',
                  background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                }}
              >
                <option value="PROMPT_INJECTION">PROMPT_INJECTION (Prompt Injection Attacks)</option>
                <option value="PII">PII (PII Leakage Detection)</option>
                <option value="JAILBREAK">JAILBREAK (Jailbreak Attempts)</option>
                <option value="DATA_EXFILTRATION">DATA_EXFILTRATION (Data Exfiltration Patterns)</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  OpenAI API Key (Optional)
                </label>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Falls back to Organization Key
                </span>
              </div>
              <input
                type="password"
                placeholder="sk-..."
                value={liveApiKey}
                onChange={(e) => setLiveApiKey(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)',
                  background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={handleLiveEvalSubmit}
                disabled={liveRunning}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {liveRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running live evaluation ({liveRunStatus})...
                  </>
                ) : (
                  'Run Live Evaluation'
                )}
              </button>
              <button
                onClick={() => setLiveEvalModalOpen(false)}
                disabled={liveRunning}
                style={{
                  padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--border-default)',
                  background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
            </div>

            {liveRunning && (
              <div style={{
                marginTop: '8px', padding: '12px', background: 'var(--bg-page)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#c7d2fe'
              }}>
                🔄 Requesting real LLM chat completions and running Sentraa Governance validations...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Model Evaluation Results Display Panel */}
      {liveSummary && (
        <div style={{
          marginTop: '28px', background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          animation: 'fade-in 0.4s'
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--border-default)', background: 'rgba(30,41,59,0.5)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span> Live Evaluation Results: {liveSummary.dataset}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Tested model <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{liveSummary.model}</span> using real live completions.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>
                  {liveSummary.passed}/{liveSummary.total}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 750 }}>
                  Passed Tests
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                  {liveSummary.failed}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 750 }}>
                  Failed Tests
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 800,
                  color: liveRunScore !== null ? (liveRunScore * 100 >= 80 ? '#22c55e' : liveRunScore * 100 >= 60 ? '#f59e0b' : '#ef4444') : '#fff'
                }}>
                  {liveRunScore !== null ? `${Math.round(liveRunScore * 100)}%` : '0%'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 750 }}>
                  Governance Score
                </div>
              </div>
              <button
                onClick={() => { setLiveSummary(null); setLiveRunResults([]); }}
                style={{
                  background: '#ffffff', border: '1px solid var(--border-default)', color: 'var(--text-secondary)',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'center'
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', background: 'rgba(15,15,26,0.3)', fontWeight: 700 }}>
                  <th style={{ padding: '16px' }}>Scenario Input</th>
                  <th style={{ padding: '16px' }}>Type</th>
                  <th style={{ padding: '16px' }}>Expected Option</th>
                  <th style={{ padding: '16px' }}>Model Response (Real-time)</th>
                  <th style={{ padding: '16px' }}>Sentraa Decision</th>
                  <th style={{ padding: '16px' }}>Latency</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {liveRunResults.map((res: any, idx: number) => {
                  const details = res.details || {};
                  const isPassed = res.passed;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(30,41,59,0.1)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 550, maxWidth: '200px', lineHeight: 1.5 }}>
                        {res.input}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {(details.tags || []).map((t: string) => (
                            <span key={t} style={{ fontSize: '8px', color: 'var(--text-muted)', background: 'var(--bg-page)', padding: '1px 6px', borderRadius: '4px' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {res.test_type}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {res.expected}
                      </td>
                      <td style={{ padding: '16px', color: '#cbd5e1', maxWidth: '250px', lineHeight: 1.4, fontStyle: details.error ? 'italic' : 'normal' }}>
                        {details.error ? (
                          <span style={{ color: '#ef4444' }}>⚠️ Error: {details.error}</span>
                        ) : (
                          details.model_response_preview || 'No response content'
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                          background: res.actual === 'BLOCKED' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: res.actual === 'BLOCKED' ? '#ef4444' : '#22c55e'
                        }}>
                          {res.actual || 'ALLOWED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                        {details.latency_ms ? `${details.latency_ms}ms` : 'N/A'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                          background: isPassed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: isPassed ? '#22c55e' : '#ef4444',
                          border: isPassed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)'
                        }}>
                          {isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationDashboard;
