# FORCH.i ORACLE — Supabase Setup Guide

## What is Supabase?

Supabase is an open-source PostgreSQL database service. We use it as the **persistent backend** for FORCH.i ORACLE so that:

- **Results survive Vercel deploys** (unlike file-based JSON)
- **Cron jobs write real data** every 6-12 hours
- **The closed-loop prediction circuit works** automatically
- **Zero manual intervention** needed once configured

---

## Step-by-Step Setup

### Step 1: Create Supabase Project (Free)

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** → Sign in with GitHub
3. Click **"New project"**
4. Fill in:
   - **Project name**: `forchi-oracle`
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `US East` for Americas)
5. Click **"Create new project"** → Wait ~2 minutes

### Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** (⚙️) → **API**
2. Copy these two values:
   - **Project URL** → Looks like `https://xxxxx.supabase.co`
   - **`service_role` secret** → Starts with `eyJhbG...` (⚠️ NOT the `anon` key!)

### Step 3: Run SQL Migration

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this repo
4. **Copy ALL the SQL** and paste it into the Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: `Success. No rows returned` (or similar)

**What this creates:**
- `match_results` — Real World Cup match scores
- `team_forms` — Team recent form, momentum, dynamic Elo
- `predictions` — Current predictions for each match
- `tournament_probs` — Champion probabilities
- `cron_status` — Cron job execution tracking

### Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project: [https://vercel.com](https://vercel.com) → your project → **Settings** → **Environment Variables**
2. Add these two variables:

| Variable | Value | Environment |
|---|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` (service_role key) | Production, Preview, Development |

3. Click **"Save"**
4. **Redeploy** your app (go to Deployments → ⋮ → Redeploy)

### Step 5: Verify Setup

1. In Supabase **Table Editor**, you should see 5 tables:
   - `match_results`
   - `team_forms`
   - `predictions`
   - `tournament_probs`
   - `cron_status`

2. In Supabase **SQL Editor**, run:
   ```sql
   SELECT * FROM cron_status;
   ```
   You should see 3 rows with status `never_run`.

### Step 6: Test with a Fictional Result

1. Use the API directly:
   ```bash
   curl -X POST https://YOUR-VERCEL-APP.vercel.app/api/match-result \
     -H "Content-Type: application/json" \
     -d '{"matchId":"A1","homeTeam":"México","awayTeam":"Sudáfrica","homeScore":2,"awayScore":0}'
   ```

2. Check Supabase **Table Editor** → `match_results` → You should see the result!

3. Refresh your app's `/live` page → The result should appear with standings updated!

---

## How the Closed Loop Works

```
┌─────────────────────────────────────────────────────┐
│              CIRCUITO CERRADO AUTOMÁTICO              │
│                                                      │
│  API-Football (league ID 9)                         │
│      ↓ (cada 6h via GitHub Actions cron)            │
│  Cron Ingest → Escribe match_results a Supabase     │
│      ↓                                               │
│  Data Layer lee de Supabase                         │
│      ↓                                               │
│  ┌─────────────────────────────────────────────┐    │
│  │  Panel En Vivo  → Goles reales + tablas     │    │
│  │  Dashboard      → Métricas de precisión     │    │
│  │  Predicción     → Predicciones actualizadas │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes (for persistence) | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes (for persistence) | Service role secret key |
| `GROQ_API_KEY` | Yes | Groq AI API key |
| `FOOTBALL_API_KEY` | Optional | API-Football key for cron ingestion |
| `CRON_SECRET` | Optional | Secret to protect cron endpoints |

---

## Troubleshooting

### "Esperando primeros resultados" even after adding results
- Check Vercel env vars: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` must be set
- Redeploy after adding env vars
- Check Supabase Table Editor → `match_results` has data

### Build fails on Vercel
- The `@supabase/supabase-js` package is installed
- Run `npm run build` locally to verify

### Local development without Supabase
- Don't set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- The app falls back to in-memory + file-store mode automatically

---

*FORCH.i © 2026 · Built by Paulo Velasco*
