# Sentra AI — The Intelligent Control Tower for AI Agent Governance

🚀 **Live Dashboard:** [https://sentra-ai.vercel.app](https://sentra-ai.vercel.app)

Sentra AI is an enterprise-grade AI governance and security platform designed for the age of autonomous agents. It provides organizations with the centralized oversight and real-time control necessary to deploy AI agents safely. Sentra AI acts as a "Trust Layer," ensuring that every action taken by an AI agent aligns with corporate policies, data privacy regulations, and security guardrails.

---

## 🚀 Production Ready — Node.js Migration Finalized (April 2026)

Sentra AI has been fully transitioned to a production-grade Node.js/TypeScript architecture. This update ensures enterprise reliability, enhanced security coverage, and a unified telemetry system for AI agent governance.

### Major Deliverables:
- **Production-Grade Node.js Backend**: Fully migrated and operational API services using Express and Prisma 7 for high-performance governance.
- **Unified Telemetry SDK**: A robust TypeScript SDK (`/sdk`) for seamless integration of external AI agents and LangChain traces into the governance dashboard.
- **Deep Scan Engine**: Implemented an automated discovery system for identifying policy violations across connected data sources with real-time polling.
- **Legacy Cleanup**: Successfully removed all legacy FastAPI and Supabase Edge Function artifacts, resulting in a clean, maintainable monorepo structure.
- **Secured Authentication**: Implemented dual-layer security with JWT rotation for the dashboard and API Key authentication for the SDK.
- **Auditable Ledger**: Fully operational Privacy & Consent Ledger with digital signatures for DPDP compliance.

---

## 🏗️ Technical Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Glassmorphism UI)
- **Backend (Production)**: Node.js 20, Express, TypeScript, Prisma 7
- **Database**: Supabase (PostgreSQL)
- **Infrastructure**: Vercel (Frontend), Render (API)

---

## 📂 Repository Structure

```text
Sentra AI/
├── frontend/                 # React + Vite + TypeScript dashboard
├── backend-node/             # [PRIMARY] Node.js (Express) production backend
├── sdk/                      # Telemetry SDK for external AI agent integration
├── render.yaml               # Universal deployment blueprint
└── README.md                 # Project overview
```

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL/Supabase account

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend Setup
```bash
cd backend-node
npm install
npx prisma generate
npm run dev
```

### 3. Database Seeding (First time setup)
The first time you connect to a new database, run the seed script to create the initial admin user and default tenant:
```bash
cd backend-node
npm run seed
```
**Default Credentials:**
- **Email:** `admin@sentra.ai`
- **Password:** `Sentra@Admin123`

---

## 🌐 Production Deployment

Sentra AI is optimized for deployment on **Vercel** and **Render**:

1. **Backend (Render)**: Connect the root repository to Render. It will automatically detect `render.yaml` and deploy the `sentra-backend-node` service.
2. **Frontend (Vercel)**: Connect the `frontend/` directory to Vercel. Ensure `VITE_API_BASE_URL` is set to your backend URL.

---

## 📈 Current Status: OPERATIONAL
The dashboard is now fully functional. Users can log in, view live incident telemetry, inspect the AI Inventory, and monitor security feeds in real-time.
