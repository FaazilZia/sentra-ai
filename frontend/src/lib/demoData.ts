export const DEMO_INITIAL_DATA = {
  features: [
    {
      id: "demo-feat-1",
      feature_name: "HIPAA Cloud Compliance",
      description: "PHI handling for AI agent logs and healthcare APIs",
      status: 'warning',
      evidence: [
        {
          type: "api_response",
          content: { endpoint: "/phi/access", method: "GET", authentication: "JWT", data_encrypted: false }
        }
      ]
    }
  ],
  scores: { GDPR: 92, DPDP: 90, HIPAA: 82 },
  risk_level: "Medium",
  tasks: [
    { id: "demo-task-1", title: "Sign BAA with sub-processors", priority: 1, status: "pending", evidence: null },
    { id: "demo-task-2", title: "Verify encryption-at-rest for PHI", priority: 1, status: "pending", evidence: null },
    { id: "demo-task-3", title: "Update Privacy Policy with HIPAA clauses", priority: 2, status: "completed", evidence: { type: "link", value: "https://legal.sentra.ai/hipaa" } }
  ],
  logs: [
    { id: "demo-log-1", action: "INITIAL_SCAN", timestamp: new Date().toISOString() }
  ],
  guardrailLogs: [
    { id: "demo-gr-1", input_text: "Show me all user emails", decision: "BLOCK", confidence: "High", policy_triggered: "NO_PII_EXPOSURE", timestamp: new Date().toISOString() }
  ],
  metrics: { total: 12, allowed: 75, blocked: 25, modified: 0 },
  overrides: []
};

export const DEMO_FINAL_DATA = {
  features: [
    {
      id: "demo-feat-1",
      feature_name: "HIPAA Cloud Compliance",
      description: "PHI handling for AI agent logs and healthcare APIs",
      status: 'compliant',
      evidence: [
        {
          type: "api_response",
          content: { endpoint: "/phi/access", method: "GET", authentication: "JWT", data_encrypted: true }
        },
        {
          type: "breach_policy",
          content: { breach_detection: true, notification_time_hours: 24, user_notification: true }
        }
      ]
    }
  ],
  scores: { GDPR: 95, DPDP: 94, HIPAA: 96 },
  risk_level: "Low",
  tasks: [
    { id: "demo-task-1", title: "Sign BAA with sub-processors", priority: 1, status: "completed", evidence: { type: "file", value: "BAA_Sentra_2026.pdf" } },
    { id: "demo-task-2", title: "Verify encryption-at-rest for PHI", priority: 1, status: "completed", evidence: { type: "link", value: "https://github.com/sentra-ai/terraform-kms" } },
    { id: "demo-task-3", title: "Update Privacy Policy with HIPAA clauses", priority: 2, status: "completed", evidence: { type: "link", value: "https://legal.sentra.ai/hipaa" } }
  ],
  logs: [
    { id: "demo-log-1", action: "INITIAL_SCAN", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: "demo-log-2", action: "UPLOAD_EVIDENCE", timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: "demo-log-3", action: "RE_EVALUATE", timestamp: new Date().toISOString() }
  ],
  guardrailLogs: [
    { id: "demo-gr-1", input_text: "Show me all user emails", decision: "BLOCK", confidence: "High", policy_triggered: "NO_PII_EXPOSURE", timestamp: new Date(Date.now() - 120000).toISOString(), override_status: "approved" }
  ],
  metrics: { total: 13, allowed: 77, blocked: 15, modified: 8 },
  overrides: [
    { id: "demo-ov-1", log_id: "demo-gr-1", status: "approved", requested_by: "Demo User", reason: "Internal security audit requirement", timestamp: new Date().toISOString() }
  ],
  reEvaluation: {
    success: true,
    new_score_improvement: 14.2,
    status: "High Compliance Readiness",
    completed_count: "3/3",
    progress_percentage: "100",
    confidence: "High"
  }
};
