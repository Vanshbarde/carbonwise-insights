# Carbon IQ (Carbonwise Insights)

Industrial carbon emission monitoring and intelligence platform. Track machines, estimate CO₂ emissions, run audits with a rule-based Master Rule Engine, generate PDF reports, and get AI-powered recommendations.

---

## Table of Contents

- [Features & Functionality](#features--functionality)
- [Models & Intelligence](#models--intelligence)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Run](#setup--run)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)

---

## Features & Functionality

### Frontend (React + Vite)

| Feature | Description |
|--------|-------------|
| **Auth** | Email/password sign up and login via Supabase Auth. Protected routes for dashboard and all app pages. |
| **Dashboard** | Overview of total machines, daily/monthly energy (kWh), daily/monthly CO₂ (kg). Summary cards and quick stats. |
| **Add Machine** | Register machines with name, type, energy source (Electricity, Coal, Natural Gas, Fuel, Other), daily consumption, runtime, temperature, sound level. Emissions calculated using configurable factors. |
| **Upload Machine Data** | Bulk or single upload of machine readings (consumption, runtime, temperature, sound) for history and analytics. |
| **Machine History** | List, filter, and manage all registered machines. View and delete machine records. |
| **Machine Analytics** | Per-machine analytics, trends, and charts for consumption and emissions. |
| **Analytics** | App-wide analytics: CO₂ and energy trends over time, charts (Recharts), comparisons. |
| **Reports** | Generate and download PDF reports (jsPDF + autoTable). Carbon IQ branded reports with emission data, charts, and summaries. Option to trigger backend PDF (ReportLab) for advanced audit reports. |
| **Settings** | User/profile and app settings. |
| **Master Rule Engine** | Rule-based evaluation per machine: **CRITICAL** (temp ≥ 89°C), **WARNING** (sound ≥ 89 dB, Fuel/Coal, runtime > 18h), **OPTIMAL** (within baseline). Recommendations for maintenance, carbon strategy, and runtime optimization. |
| **Emission Calculator** | Frontend logic: `calculateEmissions()`, `predictEmissionAfterMaintenance()`, `runMasterRuleEngine()`, `generateSuggestions()`. Optional `fetchAIRecommendations()` to backend when OpenAI is configured. |

### Backend (Flask + Python)

| Feature | Description |
|--------|-------------|
| **Carbon Audit** | `GET /api/audit` — Loads factory training history and daily check from **Supabase** (primary) or **CSV** fallback. Runs Master Rule Engine per machine, returns CO₂ (kg/day), status, anomalies, and recommendations. |
| **PDF Report** | `GET /api/report/generate?company=Name` — Multi-page Carbon Intelligence PDF: predictive 30-day CO₂ waste, deep-dive maintenance by machine type, multi-level reduction strategies, productivity scoring, projected savings chart, machine audit summary. Uses ReportLab. |
| **AI Recommendations** | `POST /api/ai-recommendations` — Sends machine/audit payload to **OpenAI (gpt-4o-mini)** for 2–4 actionable carbon reduction suggestions. Optional; frontend falls back to rule-based suggestions if unavailable. |
| **Motor Scan (Thermal)** | `POST /api/motor-scan` — Sends thermal image URL to **OpenAI Vision (gpt-4o)**. Returns status (Normal/Warning/Fault), fault area, predicted issue, recommendation. Can store results in Supabase `motor_scans` table. |
| **Health** | `GET /api/health` — Simple health check. |

### Data & Seeding

- **Supabase**: Primary store for `companies`, `machines`, `emissions`, `reports`, `profiles`, `factory_training_history`, `factory_daily_check`, optional `motor_scans`.
- **CSV fallback**: `factory_training_history.csv`, `factory_daily_check.csv` in project root for audit when Supabase is not used or for seeding.
- **Seed script**: `python seed_factory_data.py` — Imports CSV data into Supabase `factory_training_history` and `factory_daily_check`.

---

## Models & Intelligence

### 1. Thermal CO₂ Model (Linear Regression)

- **Script**: `train_model.py`
- **Input**: `emissions_data.csv` with `CO2_Labels` (and derived heat proxy).
- **Model**: **LinearRegression** (scikit-learn). Predicts CO₂ from heat proxy (`X = CO2_Labels/0.5`).
- **Output**: `thermal_model.pkl` — Saved model for use in dashboards or scripts that need heat → CO₂ prediction.

### 2. Thermal Image CO₂ Estimation

- **Script**: `predict_carbon.py` (CLI) / logic used in `app.py` (Streamlit).
- **Input**: Grayscale thermal image (path or upload). Pixel intensity = heat (0 = cold, 255 = hot).
- **Logic**: `estimated_co2 = mean(pixel_intensity) * 0.5` (kg CO₂). Same 0.5 multiplier as in training data.
- **Use**: Quick CO₂ estimate from a single thermal image; Streamlit app shows status (High/Normal) and recommendations.

### 3. Master Rule Engine (Rule-Based)

- **Location**: `main.py`, `server.py`, `src/lib/emission-calculator.ts`.
- **Purpose**: Per-machine audit status and recommendations (2026-style audit rules).
- **Rules**:
  - **CRITICAL**: Temperature ≥ 89°C → stator/insulation inspection.
  - **WARNING**: Sound ≥ 89 dB → preventive maintenance; Fuel/Coal → carbon strategy (transition to electricity/gas); Runtime > 18 h → optimize schedule.
  - **OPTIMAL**: Within 15% of historical baseline (temp, sound, consumption).
- **Extra**: Anomaly flags (Temp Abnormal, Sound Abnormal, Consumption High) and type-specific improvement advice (e.g. heating vs heavy machinery).

### 4. Predictive & Report Logic (Python)

- **Report generator** (`report_generator.py`):
  - **30-day CO₂ waste**: Escalation by anomalies (Temp +5%, Sound +5%, Consumption High +8%).
  - **Productivity score**: Carbon Efficient / Moderate / Carbon Inefficient from CO₂ per runtime hour vs baseline.
  - **Projected savings**: Current vs projected CO₂ after improvements (~15% reduction).

### 5. Optional AI (OpenAI)

- **Recommendations**: gpt-4o-mini for text suggestions from machine/audit data.
- **Thermal motor scan**: gpt-4o Vision for thermal image analysis (overheating, faults, maintenance advice).

---

## Tech Stack

- **Frontend**: Vite, TypeScript, React, React Router, TanStack Query, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, jsPDF, Supabase JS client.
- **Backend**: Flask, Pandas, Supabase Python client, OpenAI, ReportLab, python-dotenv.
- **Data**: Supabase (Auth, Postgres, optional Storage).
- **ML/Logic**: scikit-learn (LinearRegression), OpenCV/NumPy (thermal image mean), rule-based Master Rule Engine.

---

## Project Structure

```
carbonwise-insights/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── README.md
├── SETUP.md
│
├── public/
│   ├── robots.txt
│   └── placeholder.svg
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── NavLink.tsx
│   │   └── ui/                    # shadcn components (button, card, chart, etc.)
│   ├── pages/
│   │   ├── Index.tsx              # Landing
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AddMachine.tsx
│   │   ├── UploadMachineData.tsx
│   │   ├── Machines.tsx
│   │   ├── MachineAnalytics.tsx
│   │   ├── Analytics.tsx
│   │   ├── Reports.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── emission-calculator.ts  # Master Rule Engine, suggestions, AI fetch
│   │   └── utils.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   └── test/
│       ├── setup.ts
│       └── example.test.ts
│
├── app.py                          # Streamlit thermal image CO₂ estimator
├── config.py                       # Load SUPABASE_*, OPENAI_API_KEY from .env
├── main.py                         # CLI carbon audit + Master Rule Engine
├── server.py                       # Flask API (audit, report, AI, motor-scan)
├── report_generator.py             # ReportLab PDF (predictive, strategies, charts)
├── train_model.py                  # LinearRegression thermal model → thermal_model.pkl
├── predict_carbon.py               # CLI thermal image → CO₂ estimate
├── seed_factory_data.py            # CSV → Supabase factory_training_history, factory_daily_check
├── requirements.txt
│
├── factory_training_history.csv    # Optional: training history for audit
├── factory_daily_check.csv         # Optional: daily check for audit
└── emissions_data.csv              # Optional: for train_model.py
```

---

## Setup & Run

### Prerequisites

- Node.js & npm
- Python 3.10+
- Supabase project (for auth and database)

### 1. Clone and install

```bash
git clone <YOUR_GIT_URL>
cd carbonwise-insights
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL` — Supabase project URL  
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key  
- Optional: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `VITE_API_URL` (backend URL, default `http://localhost:5000`)

### 3. Frontend

```bash
npm run dev
```

Open http://localhost:8080 (or the port Vite prints).

### 4. Backend (optional, for audit, PDF, AI, motor scan)

```bash
pip install -r requirements.txt
python server.py
```

API: http://localhost:5000

### 5. Seed factory data (optional)

Ensure `factory_training_history.csv` and `factory_daily_check.csv` exist, then:

```bash
python seed_factory_data.py
```

### 6. Train thermal model (optional)

With `emissions_data.csv` in place:

```bash
pip install scikit-learn joblib pandas
python train_model.py
```

Produces `thermal_model.pkl`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes (frontend) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes (frontend) | Supabase anon/publishable key |
| `SUPABASE_URL` | Backend | Same as above or use `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (full DB) | Service role key; publishable key can be used for some tables |
| `OPENAI_API_KEY` | Optional | For `/api/ai-recommendations` and `/api/motor-scan` |
| `VITE_API_URL` | Optional | Backend base URL (default: `http://localhost:5000`) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info and endpoint list |
| GET | `/api/health` | Health check |
| GET | `/api/audit` | Carbon audit (Supabase or CSV); Master Rule Engine results |
| GET | `/api/report/generate?company=Name` | Generate Carbon Intelligence PDF report |
| POST | `/api/ai-recommendations` | AI carbon reduction suggestions (OpenAI) |
| POST | `/api/motor-scan` | Thermal image analysis (OpenAI Vision); optional save to `motor_scans` |

---

## Fix "Email not confirmed" (Supabase)

1. Supabase Dashboard → your project → **Authentication** → **Providers** → **Email**.  
2. Turn **off** “Confirm email” for development.  
3. For production, keep it on and use the confirmation link flow.

---

## Deploy

- **Frontend**: Build with `npm run build` and deploy the `dist/` folder to any static host (Vercel, Netlify, etc.).
- **Backend**: Run `server.py` on a host that supports Python (e.g. Railway, Render, or a VPS) and set `VITE_API_URL` to that URL.
#   c a r b o n _ e m i s s i o n  
 