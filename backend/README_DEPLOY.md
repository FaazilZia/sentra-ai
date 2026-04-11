# 🚀 Deploying Sentra AI Backend (FastAPI)

Follow these steps to deploy your backend to **Render** and connect it to your dashboard.

### **Step 1: Create a Web Service on Render**
1.  Go to **[dashboard.render.com](https://dashboard.render.com/)**.
2.  Click **"New +"** > **"Web Service"**.
3.  Connect your GitHub repository (`sentra-ai`).
4.  **Settings**:
    - **Name**: `sentra-ai-backend`
    - **Root Directory**: `backend` (Crucial!)
    - **Runtime**: `Docker`

### **Step 2: Add Environment Variables**
On the Render setup screen, click **"Advanced"** > **"Environment Variables"** and add these:

| Key | Value |
| :--- | :--- |
| **`APP_ENV`** | `production` |
| **`CORS_ORIGINS`** | `https://sentra-ai-nudb.vercel.app` |
| **`SUPABASE_JWT_SECRET`** | *Paste your Supabase JWT Secret here* |
| **`DATABASE_URL`** | `postgresql+psycopg://postgres.fdqfkpnbluttimjhlrgd:Faazilzia%40123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| **`SECRET_KEY`** | *Generate any random string (e.g. `your-super-secret-key-123`)* |
| **`BOOTSTRAP_DB_ON_STARTUP`** | `true` |

> [!TIP]
> **To find your JWT Secret**: Go to your **Supabase Dashboard** > **Settings (gear icon)** > **API** > scroll down to **JWT Secret**.

### **Step 3: Update Vercel**
Once Render gives you your live URL (e.g., `https://sentra-ai-backend.onrender.com`):
1.  Go to your **Vercel** project settings.
2.  Update **`VITE_API_BASE_URL`** to: `https://sentra-ai-backend.onrender.com/api/v1`
3.  **Redeploy** your frontend.

---

**Your dashboard will immediately start loading real data once this is done!**
