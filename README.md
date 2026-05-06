# 🛡️ Sentra AI — Enterprise AI Governance & Security Platform

**Sentra AI is a real-time AI Governance & Compliance Operating System that validates, controls, and audits AI agent actions before they execute.**

Traditional security tools monitor and report issues *after* they happen. **Sentra AI acts before execution** — enforcing pre-execution control, preventing risks, and mapping every decision to human-readable governance insights with compliance impact tracking (GDPR, HIPAA, DPDP).

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 7+ (or Valkey)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/sentra-ai.git
cd sentra-ai

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/sentra_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=<min-32-char-secret>
REFRESH_SECRET=<min-32-char-secret>
ENCRYPTION_KEY=<min-32-char-secret>
FRONTEND_URL=http://localhost:5173

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 4. Run

```bash
# Terminal 1: Backend
cd backend && npm run dev     # → http://localhost:3000

# Terminal 2: Frontend
cd frontend && npm run dev    # → http://localhost:5173
```

### 5. Integrate with SDK

```bash
npm install @sentra-ai/sdk
```

```typescript
import { SentraClient } from '@sentra-ai/sdk';

const client = new SentraClient({ apiKey: 'YOUR_API_KEY' });

const result = await client.checkAction({
  action_type: 'API_CALL',
  payload: { url: 'https://api.external.com/data', method: 'POST' }
});

if (result.status === 'allowed') {
  await executeAction();
} else {
  console.error(`Blocked: ${result.reason}`);
}
```

---

## 🏗️ Architecture

```
┌──────────────┐     ┌─────────────────────────────────────────┐     ┌──────────────┐
│   AI Agent   │────▶│            Sentra Engine                │────▶│  Execution   │
│  (SDK/API)   │     │                                         │     │  (if allowed) │
└──────────────┘     │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │     └──────────────┘
                     │  │Allowlist │→│ Policy  │→│ Semantic │  │
                     │  │  (L0)   │ │Engine L1│ │Risk (L2) │  │     ┌──────────────┐
                     │  └─────────┘ └─────────┘ └──────────┘  │────▶│ Audit + Alert │
                     │                                         │     └──────────────┘
                     │  Redis Cache │ PostgreSQL │ BullMQ      │
                     └─────────────────────────────────────────┘
                                        │
                                        ▼
                     ┌─────────────────────────────────────────┐
                     │         Governance Dashboard            │
                     │  React + Vite │ Real-time via Socket.io │
                     └─────────────────────────────────────────┘
```

**Decision Pipeline:** Every AI agent action flows through a multi-tier governance engine:
1. **L0 — Allowlist:** Known-safe actions are short-circuited in <2ms
2. **L1 — Policy Engine:** Organization-specific rules with Redis-cached policy lookup
3. **L2 — Pattern Engine:** Regex-based detection for PII, prompt injection, and high-risk patterns
4. **L3 — Semantic Engine:** OpenAI-powered risk analysis with fail-closed fallback

---

## 🔑 Core Features

### 🛡️ AI Governance Engine
- **Pre-execution control** — Every AI agent action is validated *before* it runs
- **Multi-tier decision pipeline** — Allowlist → Policy → Pattern → Semantic analysis
- **Fail-closed architecture** — When the AI risk engine is down, actions are blocked by default
- **Idempotent requests** — Redis-backed deduplication prevents double-processing

### ⚡ Guardrail Pipeline
- **PII detection & redaction** — SSNs, emails, phone numbers auto-masked in real-time
- **Prompt injection blocking** — Pattern-based detection of adversarial prompts
- **Input + Output scanning** — Both pre-AI (user input) and post-AI (model output) are evaluated
- **Override workflow** — Admin-approved bypass with audit trail and justification

### 📊 Compliance Center
- **GDPR / HIPAA / DPDP mapping** — Every governance decision maps to regulatory frameworks
- **Audit-proof evidence** — Cryptographic evidence chain for compliance audits
- **Automated re-evaluation** — AI-driven compliance score recalculation after remediation
- **Export-ready reports** — CSV and JSON audit log exports for regulatory review

### 🔍 Threat Intelligence
- **Real-time risk scoring** — Computed security posture across all AI activity
- **Pattern detection** — Identifies recurring attack vectors and behavioral anomalies
- **30-day trend analysis** — Historical trend data for security posture monitoring
- **Drift detection** — Monitors for policy configuration drift and alerting

### 🏢 Enterprise Multi-Tenancy
- **Organization-scoped isolation** — All data strictly isolated per tenant
- **Role-based access control** — ADMIN, AUDITOR, ENGINEER, USER roles
- **Per-org policy management** — Independent policy sets per organization
- **Data residency enforcement** — Region-tagged requests for compliance

### 🔗 Data Connectors
- **AWS S3, Google Drive, PostgreSQL** — Native scanning connectors with stream-based analysis
- **AES-256-GCM credential encryption** — All connector secrets encrypted at rest
- **Budget protection** — Hard daily cost limits with automatic circuit breaker
- **Health scoring** — Automated reliability tracking (0-100%) per connector

### 🚨 Alerting & Observability
- **Threshold-based alert rules** — Custom rules with time-window analysis
- **Multi-channel dispatch** — Email (SMTP) + Slack webhook support
- **Real-time WebSocket telemetry** — Live governance events via Socket.io
- **Security anomaly detection** — Automatic CRITICAL/HIGH/MEDIUM severity routing

### 🧠 AI Features
- **Governance chat assistant** — Natural language queries about compliance status
- **Semantic risk analysis** — OpenAI-powered deep action analysis (optional)
- **Agent inventory** — Register and track all AI agents in the organization
- **Demo sandbox** — Unauthenticated testing environment for governance policies

---

## 📁 Project Structure

```
sentra-ai/
├── backend/                    # Governance & Decision Engine
│   ├── prisma/                 #   Database schema & migrations
│   ├── src/
│   │   ├── controllers/        #   17 route controllers
│   │   ├── services/           #   Core business logic
│   │   │   ├── policyEngine.ts         # L1 policy evaluation + Redis cache
│   │   │   ├── semanticRiskEngine.ts   # L3 AI-powered risk analysis
│   │   │   ├── guardrail.service.ts    # PII/injection detection
│   │   │   ├── compliance.service.ts   # GDPR/HIPAA/DPDP engine
│   │   │   ├── cache.service.ts        # Redis cache abstraction
│   │   │   └── queue.service.ts        # BullMQ job processing
│   │   ├── middleware/         #   Auth, validation, security, rate limiting
│   │   ├── routes/             #   17 API route modules
│   │   ├── validations/        #   Zod schema definitions
│   │   ├── workers/            #   Background scan workers (S3, SQL, GDrive)
│   │   └── utils/              #   JWT, encryption, logging
│   └── .env                    #   Environment configuration
│
├── frontend/                   # Governance Dashboard (React + Vite)
│   └── src/
│       ├── pages/              #   17 page components
│       │   ├── Dashboard.tsx           # Main security overview
│       │   ├── Governance.tsx          # Policy management
│       │   ├── Guardrails.tsx          # Guardrail pipeline monitor
│       │   ├── Compliance.tsx          # GDPR/HIPAA/DPDP center
│       │   ├── RiskCenter.tsx          # Risk assessment
│       │   ├── Connect.tsx             # Data connector management
│       │   ├── Inventory.tsx           # AI agent registry
│       │   └── Demo.tsx                # Interactive governance sandbox
│       ├── components/         #   Reusable UI components
│       └── lib/                #   API client & utilities
│
├── packages/
│   └── sdk/                    # @sentra-ai/sdk (NPM package)
│       ├── src/
│       │   ├── client.ts               # SentraClient class
│       │   └── interceptors/           # OpenAI wrapper
│       └── package.json
│
├── examples/                   # Integration examples
│   └── openai-agent.js         # OpenAI agent with Sentra governance
│
├── docs/                       # Documentation
│   └── BACKUP_AND_RESTORE.md   # DR procedures
│
├── .github/                    # CI/CD workflows
├── render.yaml                 # Render deployment config
└── sentra_all_fixes.md         # Complete hardening changelog
```

---

## 🔌 API Reference

### Health & Readiness

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
| `/api/v1/policies` | GET | ✅ | List organization policies |
| `/api/v1/policies` | POST | ✅ | Create new policy |
| `/api/v1/policies/health` | GET | ✅ | Policy health status |
| `/api/v1/policies/templates` | GET | ✅ | Pre-built policy templates |

### Incidents & Compliance

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/incidents` | GET | ✅ | List incidents |
| `/api/v1/incidents/log` | POST | ✅ | Log new incident |
| `/api/v1/compliance/stats` | GET | ✅ | GDPR/HIPAA/DPDP scores |
| `/api/v1/compliance/audit-proof` | GET | ✅ | Evidence chain |
| `/api/v1/compliance/re-evaluate` | POST | ✅ | Re-run compliance evaluation |

### Connectors, Intelligence, Admin

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/connectors` | GET/POST | ✅ | Connector CRUD |
| `/api/v1/connectors/overview` | GET | ✅ | Executive overview |
| `/api/v1/intelligence/metrics` | GET | ✅ | Threat intelligence |
| `/api/v1/intelligence/patterns` | GET | ✅ | Attack patterns |
| `/api/v1/intelligence/trend` | GET | ✅ | 30-day trends |
| `/api/v1/admin/api-keys` | GET/POST | ✅ | API key management |
| `/api/v1/inventory/agents` | GET/POST | ✅ | AI agent registry |

---

## 🆚 How Sentra AI is Different

| Feature | Traditional Tools | Sentra AI |
|---|---|---|
| Post-incident monitoring | ✅ | ✅ |
| Threat detection | ✅ | ✅ |
| **Pre-execution blocking** | ❌ | ✅ |
| **Fail-closed protection** | ❌ | ✅ |
| **AI-specific governance** | ❌ | ✅ |
| **Business impact mapping** | ❌ | ✅ |
| **Multi-tier decision pipeline** | ❌ | ✅ |
| **PII auto-redaction** | ❌ | ✅ |
| **Prompt injection defense** | ❌ | ✅ |

---

## 🏦 Industry Scenarios

### Finance
Prevent unauthorized transactions and sensitive data leaks.
- **Focus:** Anti-Fraud & Ledger Integrity
- **Compliance:** SOC2, GDPR

### Healthcare
Ensure AI never exposes patient data (PHI) externally.
- **Focus:** PHI Protection & Privacy
- **Compliance:** HIPAA, HITECH

### SaaS
Control AI access to production APIs and internal systems.
- **Focus:** Privilege Escalation & Data Drift
- **Compliance:** ISO 27001

---

## 🔐 Security Posture

- ✅ **Fail-closed governance** — Actions blocked when risk engine is unavailable
- ✅ **AES-256-GCM encryption** — All secrets encrypted at rest
- ✅ **No hardcoded credentials** — All secrets via environment variables
- ✅ **CORS-locked** — Strict origin allowlisting (HTTP + WebSocket)
- ✅ **Rate limiting** — Redis-backed distributed rate limiting
- ✅ **CSP nonce enforcement** — Per-request Content-Security-Policy
- ✅ **Brute-force protection** — 10 attempts / 15 min on auth endpoints
- ✅ **Role-based access** — ADMIN, AUDITOR, ENGINEER, USER scoping
- ✅ **Audit logging** — Every governance decision is cryptographically traced

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache / Queue** | Redis + BullMQ |
| **Frontend** | React, Vite, TypeScript |
| **Real-time** | Socket.io |
| **AI** | OpenAI API (optional) |
| **Auth** | JWT + Google OAuth + Discord |
| **Encryption** | AES-256-GCM |
| **SDK** | `@sentra-ai/sdk` (NPM) |
| **Deployment** | Render / Vercel |

---

## 📋 Environment Variables

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
| `SMTP_HOST` | No | Email alert dispatch |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth for frontend |

---

## 📝 License

MIT License
