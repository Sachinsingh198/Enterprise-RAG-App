# Step-by-Step Deployment Guide: Render (Backend) + Vercel (Frontend)

This guide provides exact, step-by-step instructions to deploy your **Enterprise Agentic RAG Application**:
- **Backend (FastAPI)** -> Deployed on **Render**
- **Frontend (React + Vite)** -> Deployed on **Vercel**
- **Vector Database** -> Hosted on **Qdrant Cloud (Free Tier)**

---

## 📑 Pre-Deployment Checklist

Before deploying, ensure you have:
1. A **GitHub Repository** with your code pushed.
2. A free account on **[Render.com](https://render.com)**.
3. A free account on **[Vercel.com](https://vercel.com)**.
4. A free account on **[Qdrant Cloud](https://cloud.qdrant.io)**.
5. Your API Keys ready:
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `QDRANT_CLUSTER_ENDPOINT` & `QDRANT_API_KEY`
   - `LOGFIRE_TOKEN`
   - `PORTKEY_API_KEY` & `PORTKEY_GATEWAY_CONFIG`

---

## 🗄️ PART 1: Set Up Qdrant Cloud Vector Database

1. Log into **[cloud.qdrant.io](https://cloud.qdrant.io)**.
2. Click **Create Cluster** (Select **Free Tier / Starter**).
3. Once created, copy the **Cluster Endpoint URL** (e.g. `https://xxx-xxx.us-east-1-0.aws.cloud.qdrant.io:6333`).
4. Under API Keys, click **Generate API Key** and copy the key.

---

## ⚙️ PART 2: Deploy Backend (FastAPI) on Render

1. Log into **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** -> Select **Web Service**.
3. Connect your GitHub repository containing `EnterpriseGradeRagApplication`.
4. Fill in the service configuration:
   - **Name**: `enterprise-rag-backend` (or your choice)
   - **Region**: Choose nearest region (e.g., Oregon / Frankfurt / Singapore)
   - **Root Directory**: `backend` *(CRITICAL: Type `backend` here)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Scroll down to **Environment Variables** and click **Add Environment Variable** for each key:

| Key | Value |
| :--- | :--- |
| `GROQ_API_KEY` | `gsk_...` |
| `GEMINI_API_KEY` | `AIza...` |
| `QDRANT_CLUSTER_ENDPOINT` | `https://your-cluster-url.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | `your_qdrant_key` |
| `LOGFIRE_TOKEN` | `your_logfire_token` |
| `PORTKEY_API_KEY` | `your_portkey_key` |
| `PORTKEY_GATEWAY_CONFIG` | `pc-groq-...` |
| `PYTHON_VERSION` | `3.11.0` |

6. Click **Create Web Service**.
7. Render will build and launch your backend service. Once deployed, copy your Render Service URL (e.g. `https://enterprise-rag-backend.onrender.com`).
8. Test backend in browser: Visit `https://enterprise-rag-backend.onrender.com/health`. You should see `{"status": "online", ...}`!

---

## 🎨 PART 3: Deploy Frontend (React + Vite) on Vercel

1. Log into **[vercel.com](https://vercel.com)**.
2. Click **Add New...** -> Select **Project**.
3. Import your GitHub repository (`EnterpriseGradeRagApplication`).
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend` *(CRITICAL)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://enterprise-rag-backend.onrender.com` *(Your Render URL from Part 2)*
6. Click **Deploy**.
7. Vercel will build and deploy your React app in ~1 minute.

---

## ⚡ PART 4: Verification & Final Testing

1. Open your Vercel URL (e.g. `https://enterprise-rag-frontend.vercel.app`).
2. Verify the top Navbar status badge shows **Backend: Connected** and **Qdrant: Connected**.
3. Go to **RAG Assistant** tab and ask a test query:
   - *"What core features does this enterprise RAG system provide?"*
4. Confirm live Server-Sent Events (SSE) token streaming, reasoning steps timeline, and source citations render cleanly!
5. Go to **Knowledge Base** tab and test uploading a PDF/TXT document to ingest it into your live Qdrant cloud cluster.

---

## 🛠️ Troubleshooting Render & Vercel Issues

- **CORS Error**: The backend `app/main.py` has `CORSMiddleware` configured with `allow_origins=["*"]`, so cross-origin calls from Vercel to Render work out of the box.
- **Render Free Tier Cold Start**: Free Render instances sleep after 15 minutes of inactivity. The first request after sleep takes 30-50 seconds to spin up.
- **Vercel Route Refresh 404**: `frontend/vercel.json` rewrite rule handles client-side routing automatically.
