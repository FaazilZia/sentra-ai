import React, { useState, useEffect } from 'react';

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

const EvaluationDashboard: React.FC = () => {
  const [score, setScore] = useState<GovernanceScore | null>(null);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);
  const [runResults, setRunResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

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
    } finally { setLoading(false); }
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
    } finally { setTriggering(false); }
  };

  const viewResults = async (run: EvalRun) => {
    setSelectedRun(run);
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/v1/evaluation/runs/${run.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRunResults(data.data.results || []);
    } finally { setLoadingResults(false); }
  };

  const gradeStyle = score ? GRADE_COLORS[score.grade] || GRADE_COLORS.F : { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };

  return (
    <div style={{ padding: '24px', background: '#0f0f1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            🧪 AI Evaluation & Governance
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.875rem' }}>
            Continuous red-teaming, safety scoring, and AI governance health
          </p>
        </div>
        <button
          onClick={triggerEval}
          disabled={triggering}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: triggering ? '#334155' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 600, cursor: triggering ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem', boxShadow: triggering ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
          }}
        >
          {triggering ? '⟳ Starting...' : '▶ Run Evaluation'}
        </button>
      </div>

      {/* Governance Score Cards */}
      {score && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {/* Main Score */}
          <div style={{
            gridColumn: 'span 1', background: gradeStyle.bg, border: `1px solid ${gradeStyle.color}`,
            borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: `0 0 24px ${gradeStyle.color}22`,
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: gradeStyle.color }}>{score.grade}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: gradeStyle.color }}>{score.overall}%</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>Governance Score</div>
          </div>
          {[
            { label: 'Policy Score', value: score.policyScore, icon: '📋' },
            { label: 'Incident Score', value: score.incidentScore, icon: '🚨' },
            { label: 'Drift Score', value: score.driftScore, icon: '📊' },
            { label: 'Eval Score', value: score.evaluationScore, icon: '🧪' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'rgba(30,41,59,0.6)', border: '1px solid #1e293b',
              borderRadius: '16px', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{icon}</div>
              <div style={{
                fontSize: '1.6rem', fontWeight: 700,
                color: value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444',
              }}>{Math.round(value)}%</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{label}</div>
              {/* Score bar */}
              <div style={{ marginTop: '8px', height: '4px', background: '#1e293b', borderRadius: '2px' }}>
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
        {/* Evaluation Runs */}
        <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>
              Evaluation Runs ({total})
            </h2>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : runs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No evaluation runs yet. Click "Run Evaluation" to start.
            </div>
          ) : runs.map((run) => (
            <div
              key={run.id}
              onClick={() => viewResults(run)}
              style={{
                padding: '14px 20px', borderBottom: '1px solid #0f172a', cursor: 'pointer',
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
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{run.run_type}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
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
                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {run.passed_tests}/{run.total_tests} passed
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Run Results Panel */}
        {selectedRun && (
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>Test Results</h2>
              <button onClick={() => { setSelectedRun(null); setRunResults([]); }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loadingResults ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading results...</div>
              ) : runResults.map((result) => (
                <div key={result.id} style={{
                  padding: '12px 20px', borderBottom: '1px solid #0f172a',
                  display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '10px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '1rem' }}>{result.passed ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 500 }}>{result.test_type}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '2px' }}>
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
    </div>
  );
};

export default EvaluationDashboard;
