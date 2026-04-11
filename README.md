# Sentra AI

**Live Demo:** [https://sentra-ai-nudb.vercel.app](https://sentra-ai-nudb.vercel.app)

Sentra AI is an enterprise AI governance platform for teams that need visibility and control over how autonomous agents access internal data, policies, and approvals.

This repository currently includes:

- a React + Vite frontend for a governance dashboard
- a FastAPI backend with multi-tenant and policy foundations
- policy versioning and evaluation-oriented backend modules
- deployment-ready configuration for Vercel

## Product Direction

Sentra AI is designed to become a trust layer for enterprise AI operations. The platform is moving toward a workflow where organizations can:

- define policy controls for agent access
- evaluate whether an AI action should be allowed, blocked, masked, or escalated
- track policy versions and approval state
- maintain audit visibility for decisions and exceptions
- expose clean executive-facing summaries of posture and risk

## Current Experience

The frontend now presents Sentra AI as a more polished governance command center with:

- an executive-style overview dashboard
- live policy counts loaded from the backend
- placeholders for observability, inventory, risk, audit, and governance views
- backend health visibility in the application shell

The backend already contains the early platform building blocks for:

- authentication and tenant-aware routing
- policies, policy versions, and validation
- decision and audit related modules
- supporting models for roles, users, agents, and integrations

## Repository Structure

```text
Sentra AI/
├── frontend/                 # Vite + React + Tailwind dashboard
├── backend/                  # FastAPI API and platform services
├── VERCEL_DEPLOY.md          # Vercel deployment notes
└── README.md                 # Project overview
```

## Key Paths

Frontend:

- [frontend/src/pages/Dashboard.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/pages/Dashboard.tsx)
- [frontend/src/components/layout/AppLayout.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/components/layout/AppLayout.tsx)
- [frontend/src/components/layout/Sidebar.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/components/layout/Sidebar.tsx)
- [frontend/src/components/layout/Topbar.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/components/layout/Topbar.tsx)
- [frontend/src/index.css](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/index.css)

Backend:

- [backend/app/main.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/main.py)
- [backend/app/api/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/api/router.py)
- [backend/app/core/config.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/core/config.py)
- [backend/app/modules/policies/service.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/policies/service.py)
- [backend/app/modules/policies/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/policies/router.py)
- [backend/app/models/policy.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/policy.py)
- [backend/app/models/policy_version.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/policy_version.py)

## Local Development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

If the frontend should talk to the backend locally or on Vercel, set:

```bash
VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
```

## Deployment

This repo is prepared for a split Vercel deployment:

- `frontend/` as the dashboard UI
- `backend/` as the FastAPI API layer

Recommended backend production values:

```bash
APP_ENV=production
DEBUG=false
API_PREFIX=/api/v1
SECRET_KEY=your-secret
BOOTSTRAP_DB_ON_STARTUP=false
```

More detailed deployment notes live in [VERCEL_DEPLOY.md](/Users/mohammadfaazilzia/Desktop/Sentra AI/VERCEL_DEPLOY.md).

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Pydantic, Alembic
- Infrastructure: Vercel, PostgreSQL, Redis, Celery, Docker

## Status

Sentra AI is in an active build phase. The foundation is in place, the UI is becoming more product-like, and the backend structure is ready for deeper policy, audit, approval, and data security workflows.
