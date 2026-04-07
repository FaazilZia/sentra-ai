# Vercel Deployment

This repository is a monorepo with:

- `frontend/` -> Vite + React app
- `backend/` -> FastAPI backend

If you want to see the product live on Vercel right now, deploy the `frontend/` app first.

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
   - `VITE_API_BASE_URL`
6. Click **Deploy**

The frontend includes a `frontend/vercel.json` rewrite so React Router paths work on refresh and direct route visits.

## Recommended backend hosting

The current backend uses:

- PostgreSQL
- Redis
- Celery worker

That architecture is better hosted separately from the frontend. You can still deploy the frontend on Vercel immediately and connect the backend later.

## Notes

- Do not deploy this repo from the repository root if your goal is the UI preview. Use `frontend` as the Vercel Root Directory.
- The backend is not required for the current UI to render.
