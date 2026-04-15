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

### Recommended Deployment Order

Follow this order to avoid runtime or build failures:

1. **Supabase first**
   Create or confirm the production database connection strings.
2. **Render second**
   Add backend environment variables and let the Node.js API deploy successfully.
3. **Vercel third**
   Point the frontend to the live Render API URL and redeploy the dashboard.

### Supabase Setup

You need two PostgreSQL connection strings from Supabase:

- `DATABASE_URL`
  Use the pooled/session connection string for the running backend.
- `DIRECT_URL`
  Use the direct database connection string for Prisma migrations.

Then run:

```bash
cd backend-node
npx prisma generate
npx prisma migrate deploy
npm run seed
```

Use `npm run seed` only if you want the default demo tenant and admin user created.

### Render Setup

Configure the backend service with these values:

- **Root Directory:** `backend-node`
- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`

Required environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-vercel-domain>,http://localhost:5173`
- `PORT=10000`

### Vercel Setup

Configure the frontend project with these values:

- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Required environment variables:

- `VITE_API_BASE_URL=https://<your-render-backend-url>/api`
- `VITE_BYPASS_AUTH=false`

Do not use `localhost` in Vercel production settings.

## ✅ April 2026 Demo-Readiness Fixes

The following fixes were completed for the current branch:

- Standardized backend health response to `{"status":"healthy"}`.
- Fixed incident serialization so Prisma `event_metadata` is always exposed to the frontend as `metadata`.
- Updated `/api/incidents` to return the raw array shape expected by the dashboard.
- Fixed Observability health checks to use `status === "healthy"`.
- Removed hardcoded production API assumptions from the frontend and normalized `VITE_API_BASE_URL`.
- Fixed the shared topbar health check to use the same API client as the rest of the app.
- Restored the missing signup flow in the frontend auth context.
- Updated the SDK client to use env-based URLs instead of hardcoded Render URLs.
- Updated Render deployment files to run Prisma generate, Prisma migrate deploy, and the TypeScript build.
- Updated Prisma config to load environment variables and prefer `DIRECT_URL` for migrations.
- Aligned local development defaults so frontend local API calls point to `http://localhost:3000/api`.
- Rebuilt and verified the frontend and backend successfully.

## 📝 Report Notes

Use the points below in your project report or progress tracker:

- Backend API contract was normalized so the frontend and SDK consume consistent payloads.
- Incident telemetry now displays correctly because metadata mapping is fixed end to end.
- Observability now reflects the actual backend and policy-engine health values.
- Deployment configuration was hardened for Vercel, Render, and Supabase-based Prisma workflows.
- Local build verification passed for both the frontend and backend.
- Local runtime verification passed for `/api/health`, login, `/api/user/me`, `/api/incidents`, and `/api/policies/health`.

---

## 📈 Current Status: OPERATIONAL
The dashboard is now fully functional. Users can log in, view live incident telemetry, inspect the AI Inventory, and monitor security feeds in real-time.
