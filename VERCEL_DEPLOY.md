# Vercel Deployment

This repository is a monorepo with:

- `frontend/` -> Vite + React app
- `backend/` -> FastAPI backend

If you want to see the product live on Vercel right now, deploy both as two separate Vercel projects:

- one project with root `frontend`
- one project with root `backend`

## Frontend on Vercel

1. Push this repository to GitHub
2. Open [Vercel](https://vercel.com/new)
3. Import this GitHub repository
4. In the project settings before deploy:
   - Set **Root Directory** to `frontend`
   - Framework Preset should detect **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables only if needed:
   - `VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1`
6. Click **Deploy**

The frontend includes a `frontend/vercel.json` rewrite so React Router paths work on refresh and direct route visits.

After deploy, the top bar will show:

- `Backend: Online`
- `Backend: Offline`
- `Backend: Checking`
- `Backend: Not Set`

## Backend on Vercel

1. Create a second Vercel project from the same GitHub repo
2. Set **Root Directory** to `backend`
3. Add these environment variables:
   - `APP_NAME=NemoGuard Backend`
   - `APP_ENV=production`
   - `DEBUG=false`
   - `API_PREFIX=/api/v1`
   - `SECRET_KEY=your-secret`
   - `BOOTSTRAP_DB_ON_STARTUP=false`
4. Deploy

This backend project includes:

- `backend/index.py` as the Vercel Python entrypoint
- `backend/vercel.json` to route requests to FastAPI

### Quick backend verification

Once deployed, open:

`https://your-backend-project.vercel.app/api/v1/health`

You should get:

```json
{"status":"ok"}
```

Then set that backend base URL in the frontend Vercel project as:

`VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1`

Redeploy the frontend and the status pill will reflect backend health.

## Recommended full backend hosting later

The current backend uses:

- PostgreSQL
- Redis
- Celery worker

That architecture is better hosted separately from the frontend for full production use. Vercel is fine for the API surface and health checks, but worker/background infrastructure should live elsewhere.

## Notes

- Do not deploy this repo from the repository root. Use `frontend` and `backend` as separate Vercel project roots.
- If you want database-backed backend endpoints on Vercel, you must also configure a real external `DATABASE_URL`.
- With `BOOTSTRAP_DB_ON_STARTUP=false`, health endpoints work without forcing DB bootstrap during serverless startup.
