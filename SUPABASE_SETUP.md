# FORCH.i ORACLE — Supabase Setup Guide

## Prerequisites

- You already have a [Supabase account](https://supabase.com/dashboard)
- Your Next.js app is working locally (`npm run dev`)

---

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `forch-i-oracle`
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `US East` for iad1 Vercel region)
4. Click **"Create new project"**
5. Wait ~2 minutes for the database to be ready

---

## Step 2: Get Your Keys

1. In your Supabase dashboard, go to **Settings** ⚙️ → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **`anon` public key**: `eyJhbG...` (starts with eyJ)
   - **`service_role` key** (secret, ⚠️ never expose to frontend): `eyJhbG...`

---

## Step 3: Run the Schema SQL

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open `supabase/schema.sql` from your project
4. Copy ALL the SQL content
5. Paste into the SQL Editor
6. Click **"Run"** (or Cmd+Enter)
7. You should see "Success. No rows returned" — this is normal for CREATE TABLE

**Verify**: Go to **Table Editor** (left sidebar) and confirm you see these tables:
- `teams`
- `matches`
- `match_predictions`
- `team_form`
- `champion_probabilities`
- `cron_job_status`

---

## Step 4: Add Environment Variables

Create or update `.env.local` in your project root:

```env
# Existing
GROQ_API_KEY=gsk_...
FOOTBALL_API_KEY=your-api-football-key

# Supabase (from Step 2)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # ← use service_role key (NOT anon)

# Cron secret (generate your own)
CRON_SECRET=your-secret-here-make-it-long-and-random
```

> ⚠️ **Important**: Use `SUPABASE_SERVICE_KEY` (service_role), NOT the `anon` key.
> The service_role key bypasses Row Level Security, which is needed for API routes and cron jobs.

---

## Step 5: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## Step 6: Verify Connection

The app automatically detects Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set.

To verify:

```bash
npm run dev
```

You should see in the console:
```
[data-layer] Using Supabase data layer
```

If you don't see those variables, it falls back to in-memory:
```
[data-layer] Using in-memory data layer (Supabase not configured)
```

---

## Step 7: Seed Initial Data

### Option A: Run the seed script (recommended)

Create `scripts/seed-supabase.ts`:

```typescript
// scripts/seed-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_TEAMS, ELO_RATINGS, POWER_RATINGS } from '../lib/teams';
import { ALL_MATCHES } from '../lib/matches';

async function seed() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('Seeding teams...');
  const teams = WORLD_CUP_TEAMS.map(t => ({
    id: t.name,
    fifa_code: t.code,
    name: t.name,
    group_char: t.group,
    confederation: t.confederation,
    elo_rating: ELO_RATINGS[t.name] ?? 1500,
    power_ratings: POWER_RATINGS[t.name] ?? { attack: 50, defense: 50, midfield: 50 },
  }));

  const { error: teamError } = await supabase
    .from('teams')
    .upsert(teams, { onConflict: 'id' });

  if (teamError) {
    console.error('Team seed error:', teamError);
    return;
  }
  console.log(`✅ Seeded ${teams.length} teams`);

  console.log('Seeding matches...');
  const matches = ALL_MATCHES.map(m => ({
    id: m.id,
    match_number: m.matchday,
    group_char: m.group,
    round: m.round,
    home_team_id: m.homeTeam,
    away_team_id: m.awayTeam,
    match_date: m.date,
    match_time: m.time,
    venue: m.venue,
    city: m.city,
    status: 'scheduled',
  }));

  const { error: matchError } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'id' });

  if (matchError) {
    console.error('Match seed error:', matchError);
    return;
  }
  console.log(`✅ Seeded ${matches.length} matches`);
  console.log('🎉 Seed complete!');
}

seed().catch(console.error);
```

Run it:

```bash
npx tsx scripts/seed-supabase.ts
```

### Option B: Use the in-memory auto-seed

When you first access the app without Supabase configured, the in-memory store auto-seeds from `lib/teams.ts` and `lib/matches.ts`. When you connect Supabase, the seed script (Option A) does the same thing in the database.

---

## Step 8: Activate Cron Jobs

### On Vercel (Production)

The cron jobs are already configured in `vercel.json`:

```json
"crons": [
  { "path": "/api/cron/ingest?secret=${CRON_SECRET}", "schedule": "0 */6 * * *" },
  { "path": "/api/cron/recalculate?secret=${CRON_SECRET}", "schedule": "0 */12 * * *" },
  { "path": "/api/cron/simulate?secret=${CRON_SECRET}", "schedule": "0 0 * * *" }
]
```

When you deploy to Vercel, these will auto-activate. Make sure `CRON_SECRET` is set in Vercel environment variables.

### Local Testing

Run cron jobs manually:

```bash
# Data ingestion
curl "http://localhost:3000/api/cron/ingest?secret=your-secret-here"

# Recalculate predictions
curl "http://localhost:3000/api/cron/recalculate?secret=your-secret-here"

# Tournament simulation
curl "http://localhost:3000/api/cron/simulate?secret=your-secret-here"

# Check status
curl "http://localhost:3000/api/cron/status?secret=your-secret-here"
```

---

## Step 9: Deploy to Vercel

1. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `CRON_SECRET`
   - `GROQ_API_KEY`
   - `FOOTBALL_API_KEY`

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Verify cron jobs are running in Vercel dashboard → **Crons** tab.

---

## Troubleshooting

### "Supabase not configured" error
- Check `.env.local` has both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Restart dev server after adding env vars

### "relation does not exist" error
- The SQL schema wasn't run. Go to Supabase SQL Editor and run `supabase/schema.sql`

### Cron jobs not running
- Check `CRON_SECRET` is set in Vercel env vars
- Check Vercel dashboard → **Crons** tab for job history
- Test manually with curl first

### Predictions not showing up
- Run the recalculate cron job manually
- Check `/api/cron/status` for last run time and errors

---

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│  Vercel Cron (every 6h / 12h / daily)           │
│       ↓                                          │
│  /api/cron/ingest → API-Football → Supabase     │
│  /api/cron/recalculate → Engine → Supabase      │
│  /api/cron/simulate → 100 sims → Supabase       │
│                                                  │
│  User → /api/predict → Check Supabase cache     │
│         → If miss → Calculate → Save → Return    │
└─────────────────────────────────────────────────┘
```

Without Supabase, everything falls back to in-memory (current behavior preserved).
