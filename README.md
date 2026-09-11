# AuraFinance — AI-Powered Personal Financial Health Platform

A production-grade, end-to-end full-stack Personal Financial Health Platform built with **React**, **FastAPI**, **Supabase PostgreSQL (RLS)**, and **Google Gemini AI**.

---

## 1. Architectural Core Principles

### Principle 1: Python = Authoritative Financial Calculation Engine
- Gemini is **never** responsible for authoritative arithmetic or financial decisions.
- Whenever the application calculates:
  - Income, Expenses, Savings, Savings Rate
  - Net Worth, Solvency, Debt Burden (Debt-to-Income)
  - Emergency Fund Runway (in months)
  - 0–100 Financial Health Wellness Score
  - What-If Scenario Outcomes (Purchase Affordability, Rent Hikes, Salary Changes)
- **The calculation is computed deterministically in the Python backend.**
- Gemini acts as the conversational intelligence layer over structured calculations: interpreting facts, explaining implications in natural language, asking follow-up questions, and providing empathetic guidance.

### Principle 2: Strict Secret Isolation
- `GEMINI_API_KEY` and privileged Supabase credentials reside **exclusively in the backend environment** (`backend/.env`).
- Client-side bundles and frontend environment variables never contain or receive secret keys.
- All requests to Gemini originate exclusively from FastAPI.

### Principle 3: Row Level Security (RLS) & Verified Identity
- Supabase PostgreSQL enforces strict Row Level Security across all 8 tables.
- FastAPI verifies the authenticated session token on every API call and scopes queries strictly to `auth.uid() = user_id`.

---

## 2. System Architecture

```
                      +-----------------------------+
                      | React Frontend (Vite + CSS) |
                      +--------------+--------------+
                                     |
                         [Bearer JWT / Supabase Auth]
                                     |
                                     v
                      +-----------------------------+
                      |       FastAPI Backend       |
                      +--------------+--------------+
                                     |
            +------------------------+------------------------+
            |                                                 |
            v                                                 v
+-----------------------+                         +-----------------------+
|  Authoritative Python |                         |      Gemini API       |
|   Financial Engine    |                         |  (Backend-Only Calls) |
+-----------+-----------+                         +-----------+-----------+
            |                                                 |
            +------------------------+------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |     Supabase PostgreSQL     |
                      |   (Enforced RLS Policies)   |
                      +-----------------------------+
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide Icons, Axios, Supabase JS Client.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn, Pandas, PyPDF, Supabase Python SDK, HTTPX.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth.
- **AI Engine**: Google Gemini API (Gemini 2.5 Flash / 1.5 Flash).
- **Deployment**: Netlify (Frontend) + Render / Railway / Fly.io / Cloud Run (Backend).

---

## 4. Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry & middleware
│   │   ├── core/
│   │   │   ├── config.py            # Environment configuration
│   │   │   ├── database.py          # Supabase client factory
│   │   │   └── security.py          # Supabase JWT token verification
│   │   ├── schemas/
│   │   │   ├── models.py            # Pydantic entity models
│   │   │   └── analytics.py         # Analytics & scenario request/response schemas
│   │   ├── services/
│   │   │   ├── data_service.py      # Database access with user_id scoping
│   │   │   ├── categorization_service.py # Deterministic merchant & category rules
│   │   │   ├── analytics_service.py # Core financial calculations
│   │   │   ├── financial_health_service.py # 0-100 wellness score algorithm
│   │   │   ├── scenario_service.py  # Deterministic What-If scenario math
│   │   │   ├── csv_parser.py        # CSV bank statement extractor & duplicate detector
│   │   │   ├── pdf_parser.py        # PDF text parser with safety fallbacks
│   │   │   ├── context_builder.py   # Synthesizes relevant data for AI
│   │   │   └── gemini_service.py    # Backend-only Gemini AI client
│   │   └── api/
│   │       └── routes/              # REST API endpoints
│   ├── tests/                       # Comprehensive pytest suite
│   ├── Dockerfile                   # Container configuration
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI components & modals
│   │   ├── context/                 # AuthContext & Supabase session listener
│   │   ├── pages/                   # Complete application views
│   │   ├── services/                # API client (Axios) & Supabase client
│   │   ├── utils/                   # Currency & date formatters
│   │   ├── App.jsx                  # Protected & public routing
│   │   └── main.jsx                 # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── supabase/
│   └── schema.sql                   # Complete database schema, RLS policies, & triggers
│
├── netlify.toml                     # Netlify build & SPA routing configuration
├── render.yaml                      # Render 1-click deployment configuration
└── README.md
```

---

## 5. Environment Variables Setup

### Backend (`backend/.env`)
Create `backend/.env` based on `backend/.env.example`:
```ini
# Google Gemini API (Backend only - NEVER expose to client)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# App settings
ENVIRONMENT=development
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend (`frontend/.env`)
Create `frontend/.env` based on `frontend/.env.example`:
```ini
# Safe client-side variables only (VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 6. Database Setup (Supabase)

1. Create a new project in [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** tab in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, paste it into the editor, and click **Run**.
4. This script automatically sets up:
   - 8 core tables: `profiles`, `accounts`, `transactions`, `assets`, `liabilities`, `financial_goals`, `chatbot_conversations`, `chatbot_messages`
   - High-performance indexes on `(user_id, date)`, `(user_id, category)`, etc.
   - Row Level Security (RLS) policies on all tables (`auth.uid() = user_id`)
   - Automatic user profile creation trigger upon signup (`auth.users` -> `public.profiles`).

---

## 7. Local Development

### 1. Run Backend
```bash
# Navigate to backend
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: `http://localhost:8000`  
Swagger API documentation: `http://localhost:8000/docs`

### 2. Run Frontend
```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## 8. Running Automated Tests

Run the complete backend test suite:
```bash
cd backend
pytest tests -v
```

Verified test coverage:
- `test_analytics.py`: Authoritative financial math (Income, Expenses, Savings, Savings Rate, Net Worth).
- `test_financial_health.py`: Transparent 0–100 score weights and component breakdown.
- `test_scenarios.py`: One-time purchase affordability and rent increase simulations.
- `test_csv_parser.py`: Auto-column detection, normalization, and duplicate identification.
- `test_categorization.py`: Merchant pattern extraction and deterministic category assignments.
- `test_api.py`: FastAPI endpoints and authentication enforcement.

---

## 9. Deployment Guide

### Deploying Frontend to Netlify
1. Connect your GitHub repository to Netlify.
2. Build settings are pre-configured in `netlify.toml`:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. In Netlify Site Settings > **Environment variables**, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (URL of your deployed backend, e.g., `https://aurafinance-api.onrender.com/api`)

### Deploying Backend to Render / Railway / Cloud Run
1. Create a Web Service from the repository.
2. Set root directory to `backend`.
3. Set environment to `Python 3`.
4. Build command: `pip install -r requirements.txt`.
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add backend environment variables:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENVIRONMENT=production`
   - `CORS_ORIGINS=https://your-netlify-site.netlify.app`
