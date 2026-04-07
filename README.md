# Sentra AI

Sentra AI is an AI-agent data security platform designed to help enterprises control how autonomous agents access sensitive internal data.

It combines:

- a modern governance dashboard frontend
- a multi-tenant backend foundation
- a policy and decision layer for secure access evaluation
- deployment-ready configuration for Vercel

The goal is simple: let organizations use AI agents safely, with clear visibility, controlled access, explainable decisions, and room to scale into a full production platform.

## What Sentra AI Does

Sentra AI is built for environments where AI agents interact with enterprise systems such as documents, datasets, databases, and internal knowledge.

The platform is designed to support:

- multi-tenant enterprise organizations
- agent identities and machine access
- secure access decisions for sensitive assets
- policy-based controls for AI behavior
- approval workflows for risky requests
- audit-friendly platform architecture

In practical terms, this means Sentra AI can evolve into a system that answers questions like:

- Can this AI agent access this asset?
- Should the response be blocked, masked, redacted, or approved first?
- Why was that decision made?
- Which policies matched?
- Which data sources, assets, and classifications were involved?

## Live App

This repository is prepared for a two-project Vercel deployment:

- `frontend/` as the dashboard UI
- `backend/` as the FastAPI API layer

After deployment, your live app links can be added here:

- Frontend URL: `https://your-frontend-project.vercel.app`
- Backend URL: `https://your-backend-project.vercel.app/api/v1/health`

### How To View The Live App

1. Open the frontend Vercel URL in your browser.
2. Look at the top bar status pill.
3. If the frontend is correctly connected to the backend, it will show:
   - `Backend: Online`
   - `Backend: Offline`
   - `Backend: Checking`
   - `Backend: Not Set`

To make the live frontend talk to the live backend, the frontend Vercel project should include:

```bash
VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
```

## Project Structure

```text
Sentra AI/
├── frontend/                 # Vite + React dashboard
├── backend/                  # FastAPI backend
├── VERCEL_DEPLOY.md          # Deployment instructions
└── README.md                 # Main project overview
```

## Key Files Added

These are the most important files currently added to support the product and deployment flow.

### Frontend

- [frontend/src/App.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/App.tsx)
  Main application routing for the dashboard.

- [frontend/src/components/layout/Topbar.tsx](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/components/layout/Topbar.tsx)
  Displays backend connection status in the UI.

- [frontend/src/index.css](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/index.css)
  Global styling, including the dark visual theme.

- [frontend/vercel.json](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/vercel.json)
  Handles SPA rewrites so React Router works on Vercel.

- [frontend/.env.example](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/.env.example)
  Example environment configuration for connecting the frontend to the backend API.

- [frontend/src/vite-env.d.ts](/Users/mohammadfaazilzia/Desktop/Sentra AI/frontend/src/vite-env.d.ts)
  Adds Vite environment typing support for `import.meta.env`.

### Backend

- [backend/app/main.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/main.py)
  FastAPI application entrypoint and startup wiring.

- [backend/app/core/config.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/core/config.py)
  Central application settings and environment variables.

- [backend/app/api/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/api/router.py)
  Main API route registration.

- [backend/index.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/index.py)
  Vercel backend entrypoint.

- [backend/vercel.json](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/vercel.json)
  Routes backend traffic to the FastAPI app on Vercel.

- [backend/.env.example](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/.env.example)
  Example backend environment variables.

### Platform / Security Backend Modules

- [backend/app/models/tenant.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/tenant.py)
  Tenant model for multi-tenant isolation.

- [backend/app/models/user.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/user.py)
  User model for platform identities.

- [backend/app/models/api_key.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/api_key.py)
  Machine/API key authentication model.

- [backend/app/modules/auth/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/auth/router.py)
  Auth endpoints such as login, token refresh, and API key creation.

- [backend/app/modules/tenants/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/tenants/router.py)
  Tenant-facing API routes.

### Policy Layer

- [backend/app/models/policy.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/policy.py)
  Canonical policy model.

- [backend/app/models/policy_version.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/models/policy_version.py)
  Immutable policy version snapshots.

- [backend/app/schemas/policy.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/schemas/policy.py)
  Strong validation for policy documents, conditions, and obligations.

- [backend/app/modules/policies/service.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/policies/service.py)
  Policy creation, update, publish, and versioning logic.

- [backend/app/modules/policies/router.py](/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app/modules/policies/router.py)
  Policy CRUD and publish API routes.

## Current Capabilities

At the current stage, the repository includes:

- a production-style frontend dashboard
- backend platform/auth scaffolding
- multi-tenant foundation
- policy models and versioning
- Vercel deployment setup for frontend and backend
- frontend backend-health visibility

## Deployment Summary

### Frontend Vercel Project

- Root Directory: `frontend`
- Framework: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend Vercel Project

- Root Directory: `backend`
- Entry file: `index.py`
- Health check endpoint: `/api/v1/health`

Recommended backend environment values:

```bash
APP_ENV=production
DEBUG=false
API_PREFIX=/api/v1
SECRET_KEY=your-secret
BOOTSTRAP_DB_ON_STARTUP=false
```

Detailed deployment steps are in [VERCEL_DEPLOY.md](/Users/mohammadfaazilzia/Desktop/Sentra AI/VERCEL_DEPLOY.md).

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL, Alembic
- Infra: Redis, Celery, Docker, Vercel

## Vision

Sentra AI is not just a dashboard. It is intended to become a trust layer for enterprise AI operations.

The long-term platform vision includes:

- agent-aware access control
- explainable policy decisions
- sensitive data classification
- approval and incident workflows
- enterprise-grade auditability

## Repository Notes

- The frontend can already be deployed independently and viewed live.
- The backend is prepared for Vercel deployment for API visibility and health validation.
- Full production-grade worker, Redis, and database-backed backend flows will still need external infrastructure beyond Vercel alone.
