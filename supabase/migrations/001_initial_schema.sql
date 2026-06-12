-- FORCH.i ORACLE — Supabase Database Migration 001
-- Creates all tables needed for the closed-loop prediction system.
-- Run this SQL in your Supabase SQL Editor.
--
-- NOTE: Table names match lib/data-layer/supabase.ts exactly.

-- ═══════════════════════════════════════════════════════════════
-- TEAMS — World Cup teams with Elo and power ratings
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,                    -- e.g., 'Brasil', 'México'
  fifa_code TEXT NOT NULL,                -- e.g., 'BRA', 'MEX'
  name TEXT NOT NULL,                     -- e.g., 'Brasil', 'México'
  group_char TEXT,                        -- e.g., 'A', 'B'
  confederation TEXT,                     -- e.g., 'CONMEBOL', 'UEFA'
  elo_rating FLOAT DEFAULT 1500,
  power_ratings JSONB DEFAULT '{"attack":50,"defense":50,"midfield":50}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_fifa_code ON teams(fifa_code);
CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_char);

-- ═══════════════════════════════════════════════════════════════
-- MATCHES — All World Cup 2026 matches (128 total)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,                    -- e.g., 'A1', 'R32-1', 'QF-2'
  match_number INTEGER,                   -- sequential match number
  group_char TEXT,                        -- 'A'-'L' for group stage
  round TEXT DEFAULT 'group',             -- 'group', 'R32', 'R16', 'QF', 'SF', 'F'
  home_team_id TEXT NOT NULL,             -- team name (FK to teams.id)
  away_team_id TEXT NOT NULL,             -- team name (FK to teams.id)
  match_date TEXT,                        -- '2026-06-11'
  match_time TEXT,                        -- '16:00'
  venue TEXT,
  city TEXT,
  status TEXT DEFAULT 'scheduled',        -- 'scheduled', 'live', 'finished', 'cancelled'
  score_home INTEGER,
  score_away INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_char);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(home_team_id, away_team_id);

-- ═══════════════════════════════════════════════════════════════
-- MATCH_PREDICTIONS — Current predictions for each match
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS match_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,                 -- e.g., 'A1', 'R32-1'
  prob_team1_win FLOAT NOT NULL,          -- home win probability (0-100)
  prob_draw FLOAT NOT NULL,              -- draw probability (0-100)
  prob_team2_win FLOAT NOT NULL,          -- away win probability (0-100)
  most_likely_score TEXT,                 -- e.g., '2-1'
  expected_goals_team1 FLOAT,
  expected_goals_team2 FLOAT,
  over_25_probability FLOAT,
  btts_probability FLOAT,
  key_factors JSONB DEFAULT '[]'::jsonb,
  confidence_score FLOAT,                -- 0-100 (maps to alta/media/baja)
  data_quality_score FLOAT,
  model_version TEXT,
  analysis TEXT,
  home_key_players JSONB,
  away_key_players JSONB,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, model_version)
);

CREATE INDEX IF NOT EXISTS idx_predictions_match ON match_predictions(match_id);

-- ═══════════════════════════════════════════════════════════════
-- TEAM_FORM — Recent form, momentum, xG, dynamic Elo
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_form (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,           -- e.g., 'Brasil', 'Francia'
  last_5 JSONB DEFAULT '[]'::jsonb,       -- [{result, opponent, goalsFor, goalsAgainst, date}]
  xg_for FLOAT DEFAULT 1.2,
  xg_against FLOAT DEFAULT 1.0,
  momentum FLOAT DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  elo_dynamic FLOAT DEFAULT 1500,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_form_team ON team_form(team_id);

-- ═══════════════════════════════════════════════════════════════
-- CHAMPION_PROBABILITIES — Champion probabilities from simulation
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS champion_probabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,           -- e.g., 'Brasil'
  probability FLOAT NOT NULL,            -- champion probability (0-100)
  simulations_count INTEGER DEFAULT 100,
  total_simulations INTEGER DEFAULT 100,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_champion_probs_team ON champion_probabilities(team_id);

-- ═══════════════════════════════════════════════════════════════
-- CRON_JOB_STATUS — Track cron job execution
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cron_job_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL UNIQUE,          -- 'ingest-data', 'recalculate-predictions', 'simulate-tournament'
  last_run TIMESTAMPTZ,
  status TEXT,                            -- 'success', 'failed', 'running', 'never_run'
  duration_ms INTEGER,
  records_processed INTEGER,
  error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_name ON cron_job_status(job_name);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — Public read, service-role write
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_form ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_probabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_status ENABLE ROW LEVEL SECURITY;

-- Public can read all data (for the app frontend)
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON match_predictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON team_form FOR SELECT USING (true);
CREATE POLICY "Public read access" ON champion_probabilities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cron_job_status FOR SELECT USING (true);

-- Service role can do everything (API routes use service_role key)
-- No additional policies needed — service_role bypasses RLS

-- ═══════════════════════════════════════════════════════════════
-- Seed initial cron status
-- ═══════════════════════════════════════════════════════════════

INSERT INTO cron_job_status (job_name, status) VALUES
  ('ingest-data', 'never_run'),
  ('recalculate-predictions', 'never_run'),
  ('simulate-tournament', 'never_run')
ON CONFLICT (job_name) DO NOTHING;
