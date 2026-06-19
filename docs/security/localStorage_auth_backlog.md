# Backlog: Transition to Pure HTTP-Only Cookie Authentication

## Summary & Threat Model

In the current implementation of Sentraa AI:
1. **Backend:** Sets `sentra_access_token` and `sentra_refresh_token` as HTTP-only secure cookies on successful login/registration/refresh. However, the backend also accepts authorization tokens via the `Authorization: Bearer <token>` header, and returns the JWT directly in the API response JSON payload.
2. **Frontend:** Reads the returned JWT from the API response and stores it in `localStorage` under `sentra_access_token`. This stored token is then appended to the `Authorization` header of all outgoing api calls via `api.ts`.

### Security Vulnerability (XSS Credential Exfiltration)

By storing the JWT in `localStorage` and reading/sending it from client-side JavaScript, the application remains fully exposed to XSS (Cross-Site Scripting) credential exfiltration. An attacker who successfully runs arbitrary JavaScript on the client page can read the JWT using `localStorage.getItem('sentra_access_token')` and exfiltrate it. 

The primary security benefit of migrating to HTTP-only secure cookies—namely, preventing JavaScript access to tokens—is lost because the token is stored in parallel in `localStorage`.

---

## Architectural Decision

**Decision:** We will deprecate `localStorage` storage of the main browser access token and move to pure HTTP-only cookie-based authentication for the web client.

* **Owner:** Security & Architecture Team
* **Priority:** High (Backlog)
* **Target Cycle:** Next major release/sprint

---

## Engineering Migration Roadmap

To transition to pure HTTP-only cookie-based authentication:

### 1. Backend Changes
- **Auth Responses:** Modify the authentication controllers (`login`, `register`, `refresh`) to return *only* the user profile metadata, and stop returning `accessToken` and `refreshToken` in the JSON response body.
- **Request Authentication:** Modify the `authenticate` middleware to check *only* the secure `sentra_access_token` cookie for browser-initiated API calls.
- **API Keys / Integrations:** Keep `Authorization: Bearer <token>` support *exclusively* for SDKs, integrations, and server-to-server API requests (e.g. using specific API keys/SDK tokens starting with `sentra_` prefix).

### 2. Frontend Changes
- **Token Storage:** Remove all occurrences of `localStorage.setItem('sentra_access_token', ...)` and `localStorage.removeItem('sentra_access_token')`.
- **API Requests:** Remove token retrieval logic from `api.ts` for outgoing browser calls. Outgoing fetch calls will rely entirely on the browser attaching the secure `sentra_access_token` cookie via the `credentials: 'include'` configuration.
- **Auth Hook:** Modify `auth.tsx`'s session restore logic. Instead of loading the token from `localStorage`, it should make a `/auth/me` or `/auth/current-user` API call on boot, letting the server validate the cookie and return the active user profile.

### 3. Impact Assessment & Risks
- **Cross-Domain requests:** If the frontend and backend are hosted on separate domains, browsers might restrict third-party cookies. The hosting configuration must ensure both are on the same apex domain (e.g. `app.sentra.ai` and `api.sentra.ai`), and cookies are configured with `SameSite=lax` or `SameSite=strict` and `Secure=true`.
- **E2E/Local Testing:** The E2E tests and helper scripts (like `verify_sidebar.js`) must be adjusted since they will no longer be able to read or manipulate `sentra_access_token` from `localStorage` directly. They should rely entirely on cookies.
