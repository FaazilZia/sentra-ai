# NemoGuard Backend

Phase 1 scaffold for the NemoGuard backend MVP.

Implemented in this phase:
- FastAPI app bootstrap
- config and structured logging
- SQLAlchemy base/session
- JWT and API-key auth foundation
- tenant, user, role, user-role, and API-key models
- tenant-aware request context plumbing
- health and readiness endpoints
- auth endpoints: login, refresh, api-key creation
- current user and tenant lookup endpoints

Planned later phases:
- users/roles management APIs
- agents and identities
- data sources, discovery, assets, classification
- connector/background jobs
- audit persistence and integration context service

## Run locally

```bash
cd backend
cp .env.example .env
docker-compose up --build
```

App will be available at `http://localhost:8000`.

## Migrations

Alembic files are scaffolded in this phase; the first concrete migration will be added in a later phase once the broader model set lands.
