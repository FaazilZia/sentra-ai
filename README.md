# Sentra AI — The Intelligent Control Tower for AI Agent Governance

**Live Production URL:** [https://sentra-ai-tau.vercel.app/app]https://sentra-ai-tau.vercel.app/app

Sentra AI is an enterprise-grade AI governance and security platform designed for the age of autonomous agents. It provides organizations with the centralized oversight and real-time control necessary to deploy AI agents safely. Sentra AI acts as a "Trust Layer," ensuring that every action taken by an AI agent aligns with corporate policies, data privacy regulations, and security guardrails.

---

## 🛠️ Platform Stabilization & Node.js Migration (April 2026)

The platform has been successfully stabilized and migrated to a modern Node.js/TypeScript architecture to ensure production-grade reliability and security.

### Key Enhancements:
- **Node.js Production Backend**: Fully migrated API services to Node.js (Express/Prisma) for improved performance and robust JWT handling.
- **Automated Infrastructure**: Implemented Render Blueprint (`render.yaml`) for one-click deployment including automatic database migrations and seeding.
- **Unified Authentication**: Secured the platform with JWT access/refresh token rotation (15m/7d expiry) and robust cross-origin (CORS) security.
- **Database Hardening**: Harmonized the Supabase schema with the `users` role system for granular Role-Based Access Control (RBAC).
- **Frontend Resilience**: Fixed critical React/Vite build errors and synchronized API data fetching to match the new backend schema.

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
├── backend/                  # Python (FastAPI) [LEGACY] service
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
