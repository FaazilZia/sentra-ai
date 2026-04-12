# Sentra AI — The Intelligent Control Tower for AI Agent Governance

**Live Demo:** [https://sentra-ai-1.onrender.com](https://sentra-ai-1.onrender.com)

Sentra AI is an enterprise-grade AI governance and security platform designed for the age of autonomous agents. It provides organizations with the centralized oversight and real-time control necessary to deploy AI agents safely. Sentra AI acts as a "Trust Layer," ensuring that every action taken by an AI agent aligns with corporate policies, data privacy regulations (like India's DPDP Act), and security guardrails.

---

## 🚀 Recent Platform Updates

We have recently transitioned the platform from a simulated prototype to a **functional governance engine**. Key updates include:

- **Stability & Type Safety**: Conducted a full codebase cleanup, removing all TypeScript suppressions and ensuring a 100% type-safe frontend foundation.
- **Real Asynchronous Scanning**: Implemented a robust architecture using **Celery and Redis**. "Deep Scans" now run as true background tasks, allowing the platform to process large-scale infrastructure without blocking the UI.
- **Interactive Action Center**: Launched a real-time remediation suite. Security operators can now **Resolve**, **Block**, or **Mute** detected threats directly from the Dashboard and Security Feed.
- **Real Data Integration**: Built the `GovernanceScanner` engine. The platform now scans actual data sources (Logs, CSVs, and localized files) to detect real-world PII leaks, rather than relying on mock templates.

---

## 🛠️ Product Capabilities

Sentra AI allows organizations to:

- **Unified Visibility**: Monitor real-time telemetry from AI agents via the Sentra Edge SDK.
- **Policy Enforcement**: Define and evaluate sophisticated access controls (Allow, Block, Mask, or Escalate).
- **Incident Remediation**: Track and resolve policy violations through a centralized Incident Ledger.
- **Compliance Mapping**: Ensure adherence to global privacy standards (GDPR, DPDP) through automatic scanning and classification.
- **Executive Oversight**: Access premium, high-level summaries of organizational AI risk and security posture.

---

## 📂 Repository Structure

```text
Sentra AI/
├── frontend/                 # React + Vite + TypeScript dashboard
├── backend/                  # FastAPI + Celery + SQLAlchemy governance engine
├── VERCEL_DEPLOY.md          # Production deployment documentation
└── README.md                 # Project overview & recent updates
```

## 🏗️ Technical Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Glassmorphism UI)
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL), Pydantic v2
- **Worker/Task Queue**: Celery, Redis (Asynchronous scanning architecture)
- **Infrastructure**: Vercel (Frontend/API), Docker (Local Dev)

## 💻 Local Development

### Prerequisites
- Python 3.12+
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
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📈 Platform Status

Sentra AI is currently in **Active Build Phase**. The platform core is stable, real-time scanning is live, and we are actively expanding our data connector library to support AWS S3, Google Cloud Storage, and SQL databases.
