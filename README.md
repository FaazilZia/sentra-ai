# Sentra AI — The Intelligent Control Tower for AI Agent Governance

**Live Demo:** [https://sentra-ai-1.onrender.com/login](https://sentra-ai-1.onrender.com/login)

Sentra AI is an enterprise-grade AI governance and security platform designed for the age of autonomous agents. It provides organizations with the centralized oversight and real-time control necessary to deploy AI agents safely. Sentra AI acts as a "Trust Layer," ensuring that every action taken by an AI agent aligns with corporate policies, data privacy regulations (like India's DPDP Act), and security guardrails.

---

## 🚀 Recent Platform Restoration (Commit `eb1924e`)

We have recently synchronized the platform with our stable production baseline (`eb1924e`) and implemented several critical infrastructure repairs:

- **Enhanced Compatibility**: Standardized the backend for **Python 3.9+** and **SQLAlchemy 2.0**, ensuring cross-platform stability between local dev and Render/Vercel environments.
- **Surgical Schema Repair**: Optimized the Supabase database schema to resolve incident tracking failures and improve remediation performance.
- **Authentication Stabilization**: Hardened the Argon2 security logic to ensure 100% login uptime on live environments.
- **Real Asynchronous Scanning**: Deep Scans now run as true background tasks via Celery and Redis, allowing for non-blocking infrastructure monitoring.

---

## 🛠️ Product Capabilities

Sentra AI allows organizations to:

- **Unified Visibility**: Monitor real-time telemetry from AI agents via the Sentra Edge SDK.
- **Policy Enforcement**: Define and evaluate sophisticated access controls (Allow, Block, Mask, or Escalate).
- **Incident Remediation**: Track and resolve policy violations through a centralized, filterable Incident Ledger.
- **Compliance Mapping**: Ensure adherence to global privacy standards (GDPR, DPDP) through automatic scanning and classification.
- **Executive Oversight**: Access premium, high-level summaries of organizational AI risk and security posture.

---

## 📂 Repository Structure

```text
Sentra AI/
├── frontend/                 # React + Vite + TypeScript dashboard
├── backend/                  # FastAPI + Celery + SQLAlchemy governance engine
├── VERCEL_DEPLOY.md          # Production deployment documentation
└── README.md                 # Project overview & technical documentation
```

## 🏗️ Technical Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Glassmorphism & Cyber-Blue UI)
- **Backend**: FastAPI, SQLAlchemy 2.0 (PostgreSQL), Pydantic v2
- **Database**: Supabase Protected (PostgreSQL)
- **Worker/Task Queue**: Celery, Redis (Asynchronous scanning architecture)
- **Infrastructure**: Vercel (Frontend), Render (API), Docker (Local Dev)

## 💻 Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- Redis (Required for background scanning)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install .
uvicorn app.main:app --reload
```

## 📈 Platform Status

Sentra AI is currently in **Active Build Phase**. The platform core is stable, real-time scanning is live, and we are successfully monitoring autonomous agent activity in production environments.
