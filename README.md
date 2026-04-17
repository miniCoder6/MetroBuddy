# 🚇 MetroBuddy — AI-Driven Train Scheduling System
### Smart India Hackathon 2025 | Problem SIH25081 | Team: Last Line Metro (LLM)

> AI-powered train induction planning & scheduling for Kochi Metro Rail Limited (KMRL)

---

## 🏗 Architecture

```
Multi-Source Data → LLM Structuring → Unified Dataset
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                    CP Filter      GA Optimize    ML Predict
                    (OR-Tools)     (DEAP-style)   (RandomForest)
                              │            │            │
                         Conflict Check  Hall of Fame  Maintenance Days
                              │
                     Supervisor Dashboard (Next.js)
```

---

## 📁 Project Structure

```
metrobuddy/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # App entry point + CORS
│   ├── database.py           # MongoDB (Motor async)
│   ├── requirements.txt
│   ├── .env
│   └── routers/
│       ├── auth.py           # JWT auth
│       ├── trains.py         # Fleet CRUD
│       ├── schedule.py       # CP + GA scheduling pipeline
│       ├── maintenance.py    # ML predictions + logs
│       ├── simulation.py     # What-if scenarios
│       ├── reports.py        # LLM report generation
│       └── alerts.py         # Alert system
├── frontend/                 # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Redirect
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── maintenance/page.tsx
│   │   ├── simulation/page.tsx
│   │   ├── alerts/page.tsx
│   │   └── reports/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── KPICard.tsx
│   ├── lib/api.ts
│   └── .env.local
└── scripts/
    └── seed_db.py            # Database seeder
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

---

### Step 1 — Clone & Setup Backend

```bash
cd metrobuddy/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local
# Edit .env and set your MONGO_URI
```

**backend/.env**
```
MONGO_URI=mongodb://localhost:27017/metrobuddy
JWT_SECRET=metrobuddy_super_secret_key_2025
ANTHROPIC_API_KEY=          # Optional: for real LLM reports
PORT=8000
```

### Step 2 — Seed the Database

```bash
# From project root
python scripts/seed_db.py
```

Output:
```
🚇 Seeding MetroBuddy database...
✓ Seeded 3 users
✓ Seeded 24 trains
✓ Seeded 60 maintenance logs
✓ Seeded 6 alerts
✅ Database seeded successfully!

Login credentials:
  admin / admin123
  supervisor / super123
  planner / plan123
```

### Step 3 — Run Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

### Step 4 — Setup & Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

Frontend at: `http://localhost:3000`

---

## 🌐 Deployment

### Backend → Render (Free Tier)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/metrobuddy
   JWT_SECRET=your_production_secret_here
   ANTHROPIC_API_KEY=sk-ant-...   (optional)
   ```
6. Deploy → copy the service URL (e.g. `https://metrobuddy-api.onrender.com`)

---

### Database → MongoDB Atlas (Free Tier)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free M0 cluster
3. Create database user (username + password)
4. Add IP Allowlist: `0.0.0.0/0` (allow all — for Render)
5. Click Connect → Drivers → copy connection string:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/metrobuddy?retryWrites=true&w=majority
   ```
6. Use this as `MONGO_URI` in Render
7. Run seeder against Atlas:
   ```bash
   MONGO_URI="mongodb+srv://..." python scripts/seed_db.py
   ```

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://metrobuddy-api.onrender.com
   ```
5. Deploy → your app is live at `https://metrobuddy.vercel.app`

---

## 🔑 Default Credentials

| Username   | Password   | Role       |
|------------|------------|------------|
| admin      | admin123   | Admin      |
| supervisor | super123   | Supervisor |
| planner    | plan123    | Planner    |

---

## 🧠 AI Pipeline Explained

### Scheduling (CP + GA)
1. **Constraint Programming** filters infeasible trains:
   - Excludes `maintenance` / `ibl` status trains
   - Enforces max mileage cap (configurable)
   - Flags trains near maintenance threshold as standby-only

2. **Genetic Algorithm** optimizes:
   - Population of candidate schedules
   - Tournament selection
   - Single-point crossover
   - Random mutation
   - **Hall of Fame** tracks best-ever schedule

3. **Conflict Check** validates:
   - No train assigned to multiple routes simultaneously

### ML Maintenance Prediction
- **Model**: RandomForest (scikit-learn)
- **Features**: mileage, avg_delay, maintenance_logs, age_years, service_frequency
- **Output**: `predicted_days` (1–90), urgency level
- **Training**: synthetic data based on realistic Kochi Metro parameters

### LLM Reports
- Uses Claude API (`claude-haiku`) if `ANTHROPIC_API_KEY` is set
- Falls back to rule-based summaries if no key provided

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/trains/` | All trains |
| GET | `/api/trains/stats` | Fleet stats |
| POST | `/api/schedule/generate` | Run CP+GA pipeline |
| GET | `/api/schedule/latest` | Latest schedule |
| GET | `/api/maintenance/predictions` | ML predictions |
| POST | `/api/maintenance/logs` | Add log |
| POST | `/api/simulation/run` | What-if simulation |
| POST | `/api/reports/generate` | LLM report |
| POST | `/api/reports/explain-schedule` | Explain schedule |
| GET | `/api/alerts/` | Active alerts |
| POST | `/api/alerts/auto-generate` | Auto-create alerts |

Full interactive docs: `http://localhost:8000/docs`

---

## 🎨 Features Checklist

- [x] JWT Authentication
- [x] Operations Dashboard with live KPIs
- [x] CP + GA Scheduling Pipeline
- [x] Schedule conflict detection & highlighting
- [x] ML Maintenance Prediction (RandomForest)
- [x] What-If Simulation with parameter control
- [x] LLM-generated reports (Claude API + fallback)
- [x] Alert system (auto-generate + resolve)
- [x] Maintenance log management
- [x] Pipeline terminal output (real-time feedback)
- [x] CSV export
- [x] Responsive dark mode UI
- [x] 7-day trend charts (Recharts)
- [x] Fleet status pie chart
- [x] Maintenance urgency bar chart

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.10+ |
| Database | MongoDB Atlas (Motor async) |
| Auth | JWT (PyJWT + bcrypt) |
| ML | scikit-learn RandomForest |
| Scheduling | Custom CP + GA (DEAP-inspired) |
| LLM | Anthropic Claude API (optional) |
| Deploy FE | Vercel |
| Deploy BE | Render |
