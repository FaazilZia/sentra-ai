# Real-Time Testing Suite Implementation Plan

This plan details the creation of a comprehensive real-time testing suite (Tier 1 and Tier 2) for the Sentra AI project, targeting the live backend (`https://sentra-backend-node.onrender.com`) and frontend (`https://sentraatech.info`).

## Open Questions

> [!IMPORTANT]
> **Implementation Depth:** Your prompt provided test file scaffolding with placeholder assertions (e.g., `// Assert: 201, returns token and orgId`). Do you want me to write the **fully functional implementations** for every test case (making the actual network requests, DOM assertions, and cleanups), or do you simply want me to establish the boilerplate/skeleton files exactly as you pasted them?

> [!WARNING]
> **Live Data Alteration:** These tests will execute against your live backend on Render. I will implement a global `afterAll` hook to clean up organizations (matching `@sentra-test.com`) and agents. However, please confirm it is acceptable for automated scripts to hit the live database. 

## Proposed Changes

### Environment & Dependencies
- Install dependencies: `playwright`, `@playwright/test`, `jest`, `@types/jest`, `ts-jest`, `supertest`, `@types/supertest`, `artillery`.
- Define base URLs as environment variables `TEST_BASE_URL` and `TEST_FRONTEND_URL` so that it defaults to the live Render/Vercel apps.
- Update `backend/package.json` with the requested test scripts (`test:unit`, `test:e2e`, `test:load`, `test:all`, `test:ci`).

---

### Backend Testing Configuration

#### [MODIFY] [jest.config.js](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/jest.config.js) / [NEW] jest.config.ts
I will migrate or update the existing `jest.config.js` to `jest.config.ts` to fully support `ts-jest` for the new `tests/e2e/` location, ensuring the 3-second warm-up delay is configured (perhaps via a global setup file).

#### [NEW] [artillery.config.yml](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/load/artillery.config.yml)
Create the load test configuration to hit the live evaluate endpoint.

---

### Tier 1 — Core Tests (Supertest & Jest)

I will create the following test suites under `backend/tests/e2e/`. These will utilize Supertest pointing to `TEST_BASE_URL`.

#### [NEW] [auth.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/auth.test.ts)
Tests for user signup, login, tenant isolation, and JWT validation.

#### [NEW] [agent-interception.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/agent-interception.test.ts)
Tests verifying the decision engine correctly evaluates low, medium, and high-risk actions, detects PII, and fails closed on error.

#### [NEW] [api.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/api.test.ts)
Core CRUD API tests (agents, actions, risk, alerts, health checks).

#### [NEW] [sdk.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/sdk.test.ts)
Simulates integration with `@sentra-ai/sdk`, testing initialization, evaluation, and error handling.

---

### Tier 2 — Extended Tests (Playwright & Advanced Scenarios)

#### [NEW] [dashboard.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/dashboard.test.ts)
Playwright E2E browser test hitting `TEST_FRONTEND_URL`. Verifies rendering of the dashboard, agents, risk intelligence, observability, alerts, and settings pages.

#### [NEW] [rate-limiting.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/rate-limiting.test.ts)
Tests rate limiter boundaries on auth and API endpoints, and checks tenant isolation for limits.

#### [NEW] [drift-detection.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/drift-detection.test.ts)
Tests the drift alerts endpoint.

#### [NEW] [compliance-export.test.ts](file:///Users/mohammadfaazilzia/Desktop/Sentra AI/backend/tests/e2e/compliance-export.test.ts)
Tests the PDF export functionality and verifies content.

## Verification Plan

### Automated Tests
1. Run `npm run test:unit` to verify core Jest/Supertest setups.
2. Run `npm run test:e2e` (Playwright) to verify browser tests can start.
3. Run `npm run test:load` (Artillery) for load testing configuration validation.

I will wait for your answers to the open questions before implementing the tests.
