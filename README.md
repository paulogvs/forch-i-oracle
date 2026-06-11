# FORCH.i ORACLE ⚽🔮

> **Built with FORCH.i by Paulo Velasco** · Poisson + Dixon-Coles + Elo + xG

AI-powered sports predictions for FIFA World Cup 2026 — a **closed-loop prediction circuit** that automatically recalculates as real results come in.

---

## 🏗 Architecture

### Core Engine
| Component | Description |
|---|---|
| **Poisson + Dixon-Coles** | Statistical model calculating goal probability matrices |
| **Elo Ratings** | 48 teams with attack/defense ratings from real data |
| **xG (Expected Goals)** | Competition-adjusted scoring expectations |
| **Enhanced Engine v2** | Momentum, fatigue, altitude, travel distance, injury impact, H2H |

### Auto-Recalculation Pipeline
```
Real Result → Update Team Form → Delete Stale Predictions → Recalculate Affected → Re-simulate Bracket
```

---

## 📱 Pages

| Route | Purpose |
|---|---|
| `/` | **Dashboard** — Accuracy metrics, prediction vs reality, trend graph, Top 8 Elo |
| `/fixture` | **Pronósticos** — All 128 matches pre-filled with predicted scores |
| `/live` | **En Vivo** — Progressive real results with predicted vs real comparison (✅/❌) |
| `/veredicto` | **Veredicto** — Champion probability Top 8 from 100 simulations |
| `/torneo` | **Simulador** — Full tournament bracket simulation |
| `/pronostico` | **Predecir** — Individual match prediction |
| `/admin` | **Admin** — Enter real results, manage cron jobs |
| `/benchmark` | **Benchmark** — Model comparison testing |

---

## ⚙️ API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/predict` | POST | Single match prediction (enhanced engine) |
| `/api/fixture` | POST | All 128 match predictions with knockout resolution |
| `/api/accuracy` | GET/POST | Accuracy metrics, match comparisons, trend data |
| `/api/match-result` | POST | Submit real result → auto-recalculate affected predictions |
| `/api/simulate-tournament` | POST | 100 tournament simulations → champion probabilities |
| `/api/cron/ingest` | GET | Data ingestion from API-Football (World Cup fixtures) |
| `/api/cron/recalculate` | GET | Recalculate all upcoming match predictions |
| `/api/cron/simulate` | GET | Daily tournament re-simulation |
| `/api/cron/status` | GET | Cron job status dashboard |

---

## 🔄 Cron Jobs (GitHub Actions)

| Job | Schedule | Purpose |
|---|---|---|
| `ingest-data` | Every 6h | Fetch World Cup results, update team forms |
| `recalculate-predictions` | Every 12h | Recalculate predictions for upcoming matches |
| `simulate-tournament` | Daily 00:00 UTC | 100 tournament simulations |

---

## 🧮 Prediction Engine

### Statistical Model
1. **Elo-based lambda**: `λ = (attack + defense_rival) / 2 × homeFactor × eloFactor`
2. **Dixon-Coles correction**: τ factor for low-score cells (0-0, 1-0, 0-1, 1-1)
3. **Score matrix**: 7×7 grid (0-6 goals per side)
4. **1X2 derivation**: Sum probabilities for home/draw/away

### Enhanced Factors
- **Momentum**: Exponential decay of last 5 matches
- **Fatigue**: Days between matches penalty
- **Home Advantage**: WC2026 realistic (host +8%, continent +3-5%)
- **Altitude**: FIFA research-based (Mexico City 2200m = -15% non-acclimated)
- **Travel Distance**: Haversine venue-to-venue fatigue
- **Injury Impact**: Player role-weighted penalty
- **Competition xG**: World Cup goals weighted higher than friendlies

---

## 🚀 Setup

```bash
npm install

# .env.local
GROQ_API_KEY=your_key
FOOTBALL_API_KEY=your_key
CRON_SECRET=your_secret

npm run dev       # Development
npm run build     # Production build
```

---

## 📈 Accuracy Tracking

The home dashboard shows real-time prediction accuracy:
- **Winner Accuracy**: % of correct match winner predictions
- **Goal Error (MAE)**: Average absolute difference predicted vs real scores
- **Over 2.5 / BTTS**: Market prediction accuracy
- **Trend Graph**: Accuracy progression over tournament days

---

## 🏆 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3.4 |
| AI Analysis | Groq Llama 3.3 70B (narrative only — numbers from math) |
| Data API | API-Football (free tier) |
| Database | Supabase (PostgreSQL, optional) |
| CI/CD | GitHub Actions + Vercel |

---

*FORCH.i © 2026 · Datos oficiales FIFA · WC2026*
