# Local Test Environment Setup Guide

This document describes how to set up and run the complete local test suite for Sentraa AI using local PostgreSQL and Redis services (or Docker test containers).

---

## Prerequisites

- **Node.js** v20+
- **PostgreSQL 16+** running on port `5432`
- **Redis 7+** running on port `6379`
*(or Docker / Docker Desktop to manage both via container)*

---

## Quick Start (One-Command Setup)

### Option A: Using Docker (Recommended for Isolated Environments)

1. **Start the Test PostgreSQL & Redis Containers:**
   ```bash
   cd backend
   npm run test:db:up
   ```
   *This launches both PostgreSQL 16 (`sentra-postgres-test` on port `5432`) and Redis 7 (`sentra-redis-test` on port `6379`) using `docker-compose.test.yml`.*

2. **Run the Full Test Suite:**
   ```bash
   npm test
   ```

3. **Tear Down Test Containers (Optional):**
   ```bash
   npm run test:db:down
   ```

---

### Option B: Using Native Local Services (Homebrew / Direct Install)

1. **Ensure PostgreSQL & Redis are running:**
   ```bash
   brew services start postgresql@16
   brew services start redis
   ```

2. **Create the `postgres` Superuser Role & `sentra_test` Database:**
   ```bash
   psql -U postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
   psql -U postgres -c "CREATE DATABASE sentra_test;"
   ```

3. **Run Schema Migration & Full Test Suite:**
   ```bash
   cd backend
   npx prisma db push --accept-data-loss
   npm test
   ```

---

## Test Environment Variables

The test suite automatically defaults to:
- `DATABASE_URL_TEST`: `postgresql://postgres:postgres@localhost:5432/sentra_test`
- `REDIS_URL`: `redis://localhost:6379`
- `ENCRYPTION_KEY`: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- `JWT_SECRET`: `test-secret-for-ci`
- `JWT_REFRESH_SECRET`: `test-refresh-secret-for-ci`

---

## Running Specific Test Suites

- **Backend Unit & Integration Tests:** `npm run test:unit`
- **Queue & DLQ Tests:** `npx jest src/tests/queueDLQ.test.ts`
- **E2E API Tests (Jest):** `npm run test:e2e:jest`
- **Playwright Browser Tests:** `npm run test:e2e`
