# ManimAI v2 — AI-Powered Math Animations

ManimAI v2 is a full-stack web application designed to generate educational videos from natural language prompts. It details the prompts into script components, generates compilable Python code using the Manim Community Edition library, executes reviews with self-correction mechanisms, and handles smart rendering/compilation recovery when errors occur.

---

## 🛠 Tech Stack

* **Frontend:** Vite, React, TailwindCSS, Framer Motion, Axios, React Query (TanStack), Zustand
* **Backend:** FastAPI, SQLAlchemy 2.0 (Asyncpg), PostgreSQL (Supabase), Uvicorn, Structlog, SlowAPI
* **LLM Engine:** Gemini 2.5 Pro (Heavy agent) + Gemini 2.0 Flash (Light agent) via the official `google-genai` SDK
* **Task Queue:** Celery, Upstash Redis Broker (with TLS support)
* **Video Compiler:** Manim Community Edition (Subprocess execution with smart recovery log parsers)
* **Storage:** Cloudinary (for cloud video/thumbnail delivery)

---

## ⚙️ Initial Configuration

### 1. Database & Backend Configuration
In the `backend/` directory, copy the example template to create your `.env` file:
```powershell
cp backend/.env.example backend/.env
```
Open `backend/.env` and configure:
* **`DATABASE_URL` / `SYNC_DATABASE_URL`**: Your Supabase database connection string (use port `5432` direct host connection).
* **`REDIS_URL`**: Your Upstash Redis connection string (use `rediss://` format).
* **`GEMINI_API_KEY`**: Your Gemini API key from Google AI Studio.
* **`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_JWT_SECRET`**: Your Supabase auth parameters.
* **`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`**: Your Cloudinary credentials.

### 2. Frontend Configuration
In the `frontend/` directory, copy the template to create your `.env.local` file:
```powershell
cp frontend/.env.local.example frontend/.env.local
```
Open `frontend/.env.local` and set:
* **`VITE_SUPABASE_URL`**: Your Supabase endpoint.
* **`VITE_SUPABASE_ANON_KEY`**: Your Supabase public key.
* **`VITE_API_URL`**: Set this to `/api/v1` to utilize the Vite development proxy.

---

## 🚀 Running the Project

To start the application, run the following steps in separate terminals:

### Step 1: Database Migrations (First Time Only)
Ensure your Postgres instance is online, activate the backend virtual environment, and run the migrations:
```powershell
cd backend
.venv\Scripts\activate
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### Step 2: Start the FastAPI API Server
Launch the FastAPI development server:
```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
* **API Documentation:** `http://localhost:8000/api/docs`

### Step 3: Start the Celery Rendering Worker
Launch the background pipeline rendering worker:
```powershell
cd backend
.venv\Scripts\activate
celery -A app.workers.celery_app worker --loglevel=info --pool=solo
```
> [!IMPORTANT]
> The `--pool=solo` flag is required under Windows to allow the worker to invoke the local `manim` subprocess compile command cleanly.

### Step 4: Start the Vite React Frontend
Start the local development server:
```powershell
cd frontend
npm run dev
```
* **Local Web App:** `http://localhost:5173`

---

## 🔍 Verification & Testing
To run the automated backend tests (security checks, code parsing, and error-recovery logic classifiers):
```powershell
cd backend
.venv\Scripts\activate
python -m pytest tests/test_backend.py
```
