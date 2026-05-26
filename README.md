![](https://img.shields.io/badge/status-beta-orange)
![](https://img.shields.io/badge/license-MIT-blue)
![](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20TypeScript-informational)
![](https://img.shields.io/badge/SDK-%40sentra--ai%2Fsdk-blueviolet)

<br/>

<div align="center">
  <h1>🛡️ Sentra AI</h1>
  <p><strong>Real-time AI Governance & Security Platform — a bouncer for AI agents.</strong></p>
  <p>Sentra AI intercepts, evaluates, and enforces governance on every AI agent action <em>before</em> it executes. Unlike monitoring tools that react after the damage is done, Sentra blocks risks at the gate.</p>

  <br/>

  [![Live Dashboard](https://img.shields.io/badge/Live-Dashboard-brightgreen?style=for-the-badge&logo=vercel)](https://sentra-ai-tau.vercel.app)
  &nbsp;
  [![npm SDK](https://img.shields.io/badge/npm-%40sentra--ai%2Fsdk-red?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@sentra-ai/sdk)

</div>

<br/>

---

## Quick links

- [🚀 Live Dashboard](https://sentra-ai-tau.vercel.app) — Try Sentra AI without signing up
- [📦 SDK on npm](https://www.npmjs.com/package/@sentra-ai/sdk) — `npm install @sentra-ai/sdk`
- [📁 Project Structure](#-project-structure) — Full file tree
- [🔌 API Reference](#-api-reference) — All 55 route modules
- [🏗️ Architecture](#-architecture) — How the decision pipeline works

---

## Screenshots

| Governance Dashboard | Guardrail Pipeline |
|---|---|
| ![Dashboard](https://sentra-ai-tau.vercel.app/og-dashboard.png) | ![Guardrails](https://sentra-ai-tau.vercel.app/og-guardrails.png) |

| Compliance Center | Risk Intelligence |
|---|---|
| Coming soon | Coming soon |

> **Try it live:** [sentra-ai-tau.vercel.app](https://sentra-ai-tau.vercel.app)

---

## What Sentra AI Does

Traditional security tools monitor and report *after* an AI agent misbehaves. **Sentra AI acts before execution** — every agent action passes through a multi-tier decision engine that evaluates it against your policies, detects PII and prompt injections, and optionally runs semantic AI risk analysis, all before execution is permitted.

Think of it as a **security checkpoint** for every `agent.run()` call in your stack.

---

## Features

### 🛡️ AI Governance Engine
- **Pre-execution control** — Every AI agent action is validated before it runs
- **Multi-tier decision pipeline** — Allowlist → Policy → Pattern → Semantic analysis
- **Fail-closed architecture** — When the AI risk engine is unavailable, actions are blocked by default
- **Redis-backed deduplication** — Idempotent requests prevent double-processing
- **Demo sandbox** — Unauthenticated governance testing at `/demo`

### ⚡ Guardrail Pipeline
- **PII detection & redaction** — SSNs, emails, phone numbers auto-masked in real-time
- **Prompt injection blocking** — Pattern-based detection of adversarial prompts
- **Input + output scanning** — Both pre-AI (user input) and post-AI (model output) evaluated
- **Override workflow** — Admin-approved bypass with justification and full audit trail
- **LangChain & OpenAI wrappers** — Drop-in governance for existing agent code

### 📊 Compliance Center
- **GDPR / HIPAA / DPDP mapping** — Every governance decision maps to regulatory frameworks
- **EU AI Act & ISO 42001 / NIST AI RMF / ISO 27001** — Framework controls and obligations
- **FRIA (Fundamental Rights Impact Assessment)** — Built-in assessment workflows
- **Cryptographic evidence chain** — Audit-proof evidence for compliance reviews
- **Automated re-evaluation** — AI-driven compliance score recalculation after remediation
- **PDF + CSV export** — Audit log and report exports

### 🔍 Risk Intelligence
- **Real-time risk scoring** — Computed security posture across all AI activity
- **30-day trend analysis** — Historical trend data for security posture monitoring
- **Pattern detection** — Identifies recurring attack vectors and behavioral anomalies
- **Quantitative risk scoring** — Numerical risk scoring engine
- **Post-market monitoring** — Ongoing AI system performance tracking

### 🕵️ Shadow AI Detection
- **Unauthorized AI tool tracking** — Detect AI usage outside approved channels
- **Department-level visibility** — Risk breakdown by team and use case
- **AI agent discovery** — Automatic inventory of active agents in your org

### 🔗 Data Connectors
- **AWS S3, Google Drive, PostgreSQL** — Native scanning connectors with stream-based analysis
- **AES-256-GCM credential encryption** — All connector secrets encrypted at rest
- **Budget protection** — Hard daily cost limits with automatic circuit breaker
- **Health scoring** — Automated reliability tracking (0–100%) per connector

### 🏢 Enterprise Multi-Tenancy
- **Organization-scoped isolation** — All data strictly isolated per tenant (RLS enforced)
- **Role-based access control** — ADMIN, AUDITOR, ENGINEER, USER roles
- **Per-org policy management** — Independent policy sets per organization
- **SSO / OAuth** — Google OAuth + SSO support
- **RBAC** — Fine-grained permission management

### 🚨 Alerting & Observability
- **Threshold-based alert rules** — Custom rules with time-window analysis
- **Multi-channel dispatch** — Email (Postmark SMTP) + Slack webhook
- **Real-time WebSocket telemetry** — Live governance events via Socket.io
- **Drift detection & alerting** — Policy configuration drift monitoring
- **Automations** — Trigger actions on governance events (drift, alerts, schedule)

### 🧠 AI Features
- **Governance chat assistant (Advisor)** — Natural language queries about compliance status
- **Semantic risk analysis** — OpenAI-powered deep action analysis (L3, optional)
- **AI agent inventory** — Register and track all AI agents in the organization
- **Evaluation dashboard** — LLM evaluation and testing workflows
- **Change history** — Full audit trail per entity

### 📋 Additional Modules
- **Vendor risk management** — Third-party AI vendor risk tracking
- **Training register** — AI literacy and training records
- **Trust portal** — Public-facing AI transparency page
- **Evidence center** — Structured evidence storage for compliance
- **Datasets registry** — Dataset tracking and lineage
- **Workflow engine** — Approval workflows and impact assessments
- **Executive reporting** — PDF-exportable governance reports
- **Search** — Cross-platform governance search
- **Shared links** — Shareable governance views

---

## Architecture

```
┌──────────────┐     ┌─────────────────────────────────────────────┐     ┌──────────────┐
│   AI Agent   │────▶│              Sentra Engine                  │────▶│  Execution   │
│  (SDK/API)   │     │                                             │     │ (if allowed) │
└──────────────┘     │  ┌──────────┐ ┌──────────┐ ┌───────────┐   │     └──────────────┘
                     │  │Allowlist │→│  Policy  │→│ Semantic  │   │
                     │  │  (L0)   │ │Engine(L1)│ │Risk (L2/3)│   │     ┌──────────────┐
                     │  └──────────┘ └──────────┘ └───────────┘   │────▶│ Audit + Alert│
                     │                                             │     └──────────────┘
                     │  Redis Cache │ PostgreSQL (RLS) │ BullMQ   │
                     └─────────────────────────────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────────┐
                     │           Governance Dashboard              │
                     │  React + Vite + TypeScript │ Socket.io live │
                     └─────────────────────────────────────────────┘
```

**Decision Pipeline — every agent action flows through:**

1. **L0 — Allowlist:** Known-safe actions short-circuited in <2ms
2. **L1 — Policy Engine:** Org-specific rules with Redis-cached policy lookup
3. **L2 — Pattern Engine:** Regex-based detection for PII, prompt injection, and high-risk patterns
4. **L3 — Semantic Engine:** OpenAI-powered risk analysis with fail-closed fallback

---

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (or Valkey)

### 1. Clone & Install

```bash
git clone https://github.com/FaazilZia/sentra-ai.git
cd sentra-ai

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/sentra_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=<min-32-char-secret>
REFRESH_SECRET=<min-32-char-secret>
ENCRYPTION_KEY=<min-32-char-secret>
FRONTEND_URL=http://localhost:5173

# Optional — enables L3 semantic risk analysis
OPENAI_API_KEY=sk-...

# Optional — email alerts
POSTMARK_API_KEY=...
SMTP_FROM=alerts@yourdomain.com

# Optional — Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

**Post-migration:** Apply RLS policies by running the SQL in `backend/prisma/migrations/rls_policies/migration.sql` in your database. All 9 core tables must have `rowsecurity = true`.

Expected seed counts per organization:
- Controls: 17
- Compliance obligations: 23

### 4. Run

```bash
# Terminal 1: Backend
cd backend && npm run dev     # → http://localhost:3000

# Terminal 2: Frontend
cd frontend && npm run dev    # → http://localhost:5173
```

### 5. Integrate via SDK

```bash
npm install @sentra-ai/sdk
```

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const client = new SentraClient({ apiKey: 'YOUR_API_KEY' });

const result = await client.checkAction({
  agent: 'my-agent',
  action: 'send_email',
  metadata: { recipient: 'user@example.com' }
});

if (result.status === 'allowed') {
  await executeAction();
} else {
  console.error(`Blocked: ${result.reason}`);
}
```

### LangChain Integration

```typescript
import { LangChainGovernanceHandler } from '@sentra-ai/sdk';

const handler = new LangChainGovernanceHandler(organizationId, 'my-langchain-agent');

// Attach to your LangChain agent — governance is enforced on every tool call
agent.on('tool:start', (tool, input, runId) => handler.handleToolStart(tool, input, runId));
```

### OpenAI Wrapper

```typescript
import { wrapOpenAIChatCompletion } from '@sentra-ai/sdk';

const response = await wrapOpenAIChatCompletion(
  () => openai.chat.completions.create({ model: 'gpt-4o', messages }),
  userPrompt,
  organizationId
);
```

---

## Deployment

### Render (Backend)

The `render.yaml` in the root configures the backend as a Render web service. Set all environment variables in the Render dashboard and deploy from the `backend/` directory.

### Vercel (Frontend)

The frontend is configured for Vercel deployment. Set `VITE_API_BASE_URL` to your Render backend URL.

Current live deployment: [sentra-ai-tau.vercel.app](https://sentra-ai-tau.vercel.app)

---

## Project Structure

```
sentra-ai/
├── backend/                          # Governance & Decision Engine (Node.js + Express)
│   ├── prisma/
│   │   ├── schema.prisma             # Full data model
│   │   └── migrations/               # DB migrations + RLS policies
│   └── src/
│       ├── controllers/              # Route controllers (55 modules)
│       ├── services/
│       │   ├── decisionEngine.ts         # Core L0–L3 decision pipeline
│       │   ├── policyEngine.ts           # L1 policy evaluation + Redis cache
│       │   ├── semanticRiskEngine.ts     # L3 AI-powered risk analysis
│       │   ├── guardrail.service.ts      # PII/injection detection
│       │   ├── compliance.service.ts     # GDPR/HIPAA/DPDP engine
│       │   ├── drift.service.ts          # Drift detection & scoring
│       │   ├── automation.service.ts     # Event-driven automation engine
│       │   ├── cache.service.ts          # Redis cache abstraction
│       │   └── queue.service.ts          # BullMQ job processing
│       ├── workers/
│       │   ├── langchain.worker.ts       # LangChain governance handler
│       │   ├── openai.worker.ts          # OpenAI SDK governance wrapper
│       │   ├── s3.worker.ts              # AWS S3 scanner
│       │   ├── gdrive.worker.ts          # Google Drive scanner
│       │   └── sql.worker.ts             # PostgreSQL scanner
│       ├── middleware/               # Auth, validation, rate limiting, CSP
│       ├── routes/                   # 55 API route modules
│       ├── validations/              # Zod schema definitions
│       └── utils/                    # JWT, encryption, logging
│
├── frontend/                         # Governance Dashboard (React + Vite + TypeScript)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx             # Main security overview
│       │   ├── Governance.tsx            # Policy management
│       │   ├── GovernanceOS.tsx          # Governance operating system
│       │   ├── Guardrails.tsx            # Guardrail pipeline monitor
│       │   ├── Compliance.tsx            # GDPR/HIPAA/DPDP center
│       │   ├── RiskCenter.tsx            # Risk assessment
│       │   ├── Drift.tsx                 # Drift detection & alerts
│       │   ├── ShadowAI.tsx              # Shadow AI detection
│       │   ├── Inventory.tsx             # AI agent registry
│       │   ├── AIRegistry.tsx            # AI system registry
│       │   ├── Advisor.tsx               # Governance chat assistant
│       │   ├── Automations.tsx           # Event-driven automations
│       │   ├── Workflows.tsx             # Approval workflows
│       │   ├── Compliance.tsx            # Compliance obligations
│       │   ├── Evidence.tsx              # Evidence center
│       │   ├── VendorRisk.tsx            # Vendor risk management
│       │   ├── TrainingRegister.tsx      # AI literacy register
│       │   ├── TrustPortal.tsx           # Public transparency page
│       │   ├── Datasets.tsx              # Dataset registry
│       │   ├── EvaluationDashboard.tsx   # LLM evals
│       │   ├── ExecutiveReport.tsx       # PDF reporting
│       │   ├── AuditExplorer.tsx         # Audit trail explorer
│       │   └── Demo.tsx                  # Interactive sandbox
│       ├── components/               # Reusable UI components
│       └── lib/                      # API client, store, utilities
│
├── packages/
│   └── sdk/                          # @sentra-ai/sdk (npm v1.0.3)
│       └── src/
│           └── index.ts              # SentraClient + LangChain/OpenAI wrappers
│
├── examples/
│   └── openai-agent.js               # OpenAI agent integration example
│
├── docs/
│   └── BACKUP_AND_RESTORE.md         # DR procedures
│
├── helm/sentra/                      # Kubernetes Helm chart
├── k8s/                              # Kubernetes manifests
├── observability/                    # Observability configs
├── .github/                          # CI/CD + SonarCloud workflows
└── render.yaml                       # Render deployment config
```

---

## API Reference

### Health

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | No | Health check |
| `/api/ready` | GET | No | Readiness (DB + Redis) |

### Authentication

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/login` | POST | No | Email/password login → JWT |
| `/api/v1/auth/register` | POST | No | Create account |
| `/api/v1/auth/refresh` | POST | No | Refresh access token |
| `/api/v1/auth/me` | GET | ✅ | Current user profile |
| `/api/v1/auth/google` | POST | No | Google OAuth login |
| `/api/v1/sso` | GET/POST | — | SSO authentication |

### AI Governance

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/ai/check-action` | POST | ✅ | Evaluate an AI agent action |
| `/api/v1/ai/chat` | POST | ✅ | Governance AI assistant |
| `/api/v1/ai/logs` | GET | ✅ | Action audit trail |
| `/api/v1/ai/dashboard-stats` | GET | ✅ | Dashboard metrics |
| `/api/v1/ai/security-score` | GET | ✅ | Computed risk score |

### Guardrails

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/guardrails/proxy` | POST | ✅ | Full input→AI→output pipeline |
| `/api/v1/guardrails/action` | POST | ✅ | Action-level guardrail check |
| `/api/v1/guardrails/demo` | POST | No | Demo mode (no auth required) |
| `/api/v1/guardrails/logs` | GET | ✅ | Interception audit trail |
| `/api/v1/guardrails/logs/export` | GET | ✅ | CSV/JSON log export |
| `/api/v1/guardrails/metrics` | GET | ✅ | Enforcement metrics |
| `/api/v1/guardrails/overrides` | GET | ✅ | Override request queue |

### Policies

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/policies` | GET/POST | ✅ | List / create policies |
| `/api/v1/policies/health` | GET | ✅ | Policy health status |
| `/api/v1/policies/templates` | GET | ✅ | Pre-built policy templates |

### Compliance & Frameworks

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/compliance/stats` | GET | ✅ | GDPR/HIPAA/DPDP scores |
| `/api/v1/compliance/audit-proof` | GET | ✅ | Evidence chain |
| `/api/v1/compliance/re-evaluate` | POST | ✅ | Re-run compliance evaluation |
| `/api/v1/eu-ai-act` | GET | ✅ | EU AI Act controls |
| `/api/v1/iso42001` | GET | ✅ | ISO 42001 controls |
| `/api/v1/iso27001` | GET | ✅ | ISO 27001 controls |
| `/api/v1/fria` | GET/POST | ✅ | Fundamental Rights Impact Assessment |
| `/api/v1/framework-mapper` | GET | ✅ | Cross-framework control mapping |

### Incidents, Alerts & Drift

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/incidents` | GET | ✅ | List incidents |
| `/api/v1/incidents/log` | POST | ✅ | Log new incident |
| `/api/v1/alerts` | GET/POST | ✅ | Alert rules CRUD |
| `/api/v1/drift` | GET | ✅ | Drift alerts |
| `/api/v1/drift/scan` | POST | ✅ | Trigger drift scan |
| `/api/v1/post-market-monitoring` | GET | ✅ | Post-market monitoring dashboard |

### Intelligence & Risk

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/intelligence/metrics` | GET | ✅ | Threat intelligence |
| `/api/v1/intelligence/patterns` | GET | ✅ | Attack patterns |
| `/api/v1/intelligence/trend` | GET | ✅ | 30-day trends |
| `/api/v1/risk` | GET/POST | ✅ | Risk assessments |
| `/api/v1/quantitative-risk` | GET | ✅ | Quantitative risk scores |

### Connectors & Data

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/connectors` | GET/POST | ✅ | Connector CRUD |
| `/api/v1/connectors/overview` | GET | ✅ | Executive overview |
| `/api/v1/datasets` | GET/POST | ✅ | Dataset registry |
| `/api/v1/evidence` | GET/POST | ✅ | Evidence center |
| `/api/v1/file-ingestion` | POST | ✅ | File upload & scan |

### Inventory & Agents

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/inventory/agents` | GET/POST | ✅ | AI agent registry |
| `/api/v1/ai-systems` | GET/POST | ✅ | AI system registry |
| `/api/v1/shadow-ai` | GET | ✅ | Shadow AI detection |
| `/api/v1/vendor` | GET/POST | ✅ | Vendor risk management |

### Reports & Workflows

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/executive-report` | GET | ✅ | Executive PDF report |
| `/api/v1/reports` | GET | ✅ | Report center |
| `/api/v1/workflows` | GET/POST | ✅ | Approval workflows |
| `/api/v1/automations` | GET/POST | ✅ | Governance automations |
| `/api/v1/audit` | GET | ✅ | Full audit log |
| `/api/v1/change-history` | GET | ✅ | Per-entity change history |
| `/api/v1/search` | GET | ✅ | Cross-platform search |

### Admin & Org

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/admin/api-keys` | GET/POST | ✅ | API key management |
| `/api/v1/organization` | GET/PUT | ✅ | Org settings |
| `/api/v1/rbac` | GET/POST | ✅ | Role management |
| `/api/v1/superadmin` | — | ✅ | Platform superadmin |
| `/api/v1/tenant` | — | ✅ | Tenant management |
| `/api/v1/notifications` | GET | ✅ | In-app notifications |
| `/api/v1/slack` | POST | No | Slack webhook endpoint |
| `/api/v1/share-link` | GET/POST | — | Shareable governance views |
| `/api/v1/trust-portal` | GET | No | Public trust portal |
| `/api/v1/training` | GET/POST | ✅ | Training register |
| `/api/v1/advisor` | POST | ✅ | AI governance advisor |

---

## How Sentra AI is Different

| Capability | Traditional SIEM/SOC | Other AI Guardrails | Sentra AI |
|---|---|---|---|
| Post-incident monitoring | ✅ | ✅ | ✅ |
| Threat detection | ✅ | ✅ | ✅ |
| **Pre-execution blocking** | ❌ | Partial | ✅ |
| **Fail-closed architecture** | ❌ | ❌ | ✅ |
| **Multi-tier decision pipeline** | ❌ | ❌ | ✅ |
| **PII auto-redaction** | ❌ | Partial | ✅ |
| **Prompt injection defense** | ❌ | Partial | ✅ |
| **Compliance framework mapping** | Manual | ❌ | ✅ |
| **Shadow AI detection** | ❌ | ❌ | ✅ |
| **LangChain/OpenAI native wrappers** | ❌ | ❌ | ✅ |
| **Full multi-tenancy + RLS** | ❌ | ❌ | ✅ |

---

## Industry Scenarios

### Finance
Prevent unauthorized transactions and sensitive data leaks from AI agents accessing financial systems.
- **Focus:** Anti-fraud & ledger integrity
- **Compliance:** SOC 2, GDPR

### Healthcare
Ensure AI never exposes patient data (PHI) externally — even when an agent is compromised.
- **Focus:** PHI protection & privacy
- **Compliance:** HIPAA, HITECH

### SaaS / Enterprise
Control AI access to production APIs, internal systems, and customer data with org-scoped policies.
- **Focus:** Privilege escalation & data drift
- **Compliance:** ISO 27001, EU AI Act

---

## Security Posture

- ✅ **Fail-closed governance** — Actions blocked when risk engine is unavailable
- ✅ **AES-256-GCM encryption** — All connector secrets and sensitive data encrypted at rest
- ✅ **Row-Level Security** — PostgreSQL RLS enforced across all 9 core tenant tables
- ✅ **No hardcoded credentials** — All secrets via environment variables
- ✅ **CORS-locked** — Strict origin allowlisting (HTTP + WebSocket)
- ✅ **Redis-backed rate limiting** — Distributed rate limiting across all endpoints
- ✅ **CSP nonce enforcement** — Per-request Content-Security-Policy
- ✅ **Brute-force protection** — 10 attempts / 15 min on auth endpoints
- ✅ **RBAC** — ADMIN, AUDITOR, ENGINEER, USER scoping
- ✅ **Cryptographic audit trail** — Every governance decision is cryptographically traced
- ✅ **SonarCloud CI** — Quality Gate enforced on every push

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL + Prisma ORM + RLS |
| **Cache / Queue** | Redis + BullMQ |
| **Frontend** | React, Vite, TypeScript, Tailwind |
| **Real-time** | Socket.io |
| **AI** | OpenAI API (optional, L3 only) |
| **Auth** | JWT + Refresh tokens + Google OAuth + SSO |
| **Encryption** | AES-256-GCM |
| **Email** | Postmark |
| **SDK** | `@sentra-ai/sdk` v1.0.3 (npm) |
| **CI/CD** | GitHub Actions + SonarCloud |
| **Deployment** | Render (backend) + Vercel (frontend) |
| **K8s** | Helm chart included |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Access token signing key (32+ chars) |
| `REFRESH_SECRET` | ✅ | Refresh token signing key (32+ chars) |
| `ENCRYPTION_KEY` | ✅ | AES-256 encryption key (32+ chars) |
| `FRONTEND_URL` | ✅ | CORS allowed origin |
| `PORT` | No | Backend port (default: 3000) |
| `OPENAI_API_KEY` | No | Enables L3 semantic risk analysis |
| `POSTMARK_API_KEY` | No | Email alert dispatch |
| `SMTP_FROM` | No | Sender address for alerts |
| `SLACK_WEBHOOK_URL` | No | Slack notification channel |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth for frontend |

---

## License

MIT License
