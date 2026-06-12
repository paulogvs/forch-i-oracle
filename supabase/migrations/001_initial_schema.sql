-- FORCH.i ORACLE — Supabase Database Migration 001
-- Creates all tables needed for the closed-loop prediction system.
-- Run this SQL in your Supabase SQL Editor.

-- ═══════════════════════════════════════════════════════════════
-- MATCH RESULTS — Real World Cup match scores
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,       -- e.g., 'A1', 'R32-1', 'QF-2'
  home_team TEXT NOT NULL,              -- e.g., 'México'
  away_team TEXT NOT NULL,              -- e.g., 'Sudáfrica'
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner TEXT NOT NULL,                 -- homeTeam, awayTeam, or 'draw'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_created ON match_results(created_at);

-- ═══════════════════════════════════════════════════════════════
-- TEAM FORMS — Recent form, momentum, xG, dynamic Elo
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,         -- e.g., 'Brasil', 'Francia'
  last_5 JSONB DEFAULT '[]'::jsonb,     -- [{result, opponent, goalsFor, goalsAgainst, date}]
  xg_for FLOAT DEFAULT 1.2,
  xg_against FLOAT DEFAULT 1.0,
  momentum FLOAT DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  elo_dynamic FLOAT DEFAULT 1500,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_forms_team_id ON team_forms(team_id);

-- ═══════════════════════════════════════════════════════════════
-- PREDICTIONS — Current predictions for each match
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,        -- e.g., 'A1', 'R32-1'
  home_win FLOAT NOT NULL,
  draw FLOAT NOT NULL,
  away_win FLOAT NOT NULL,
  most_likely_score TEXT,               -- e.g., '2-1'
  expected_goals_home FLOAT,
  expected_goals_away FLOAT,
  over_25_probability FLOAT,
  btts_probability FLOAT,
  confidence TEXT,                      -- 'alta', 'media', 'baja'
  data_quality_score FLOAT,
  model_version TEXT,
  top_scores JSONB DEFAULT '[]'::jsonb, -- [{home, away, probability}]
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);

-- ═══════════════════════════════════════════════════════════════
-- TOURNAMENT PROBS — Champion probabilities from simulation
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tournament_probs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,                -- e.g., 'Brasil'
  champion_prob FLOAT NOT NULL,         -- percentage (0-100)
  simulations_count INTEGER DEFAULT 100,
  total_simulations INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_probs_team ON tournament_probs(team_id);

-- ═══════════════════════════════════════════════════════════════
-- CRON STATUS — Track cron job execution
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cron_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL UNIQUE,        -- 'ingest-data', 'recalculate-predictions', 'simulate-tournament'
  last_run TIMESTAMPTZ,
  status TEXT,                          -- 'success', 'failed', 'running'
  duration_ms INTEGER,
  records_processed INTEGER,
  error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_status_job ON cron_status(job_name);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — Public read, service-role write
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_probs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_status ENABLE ROW LEVEL SECURITY;

-- Public can read all data (for the app frontend)
CREATE POLICY "Public read access" ON match_results FOR SELECT USING (true);
CREATE POLICY "Public read access" ON team_forms FOR SELECT USING (true);
CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tournament_probs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cron_status FOR SELECT USING (true);

-- Service role can do everything (API routes use service_role key)
-- No additional policies needed — service_role bypasses RLS

-- ═══════════════════════════════════════════════════════════════
-- Seed initial cron status
-- ═══════════════════════════════════════════════════════════════

INSERT INTO cron_status (job_name, status) VALUES
  ('ingest-data', 'never_run'),
  ('recalculate-predictions', 'never_run'),
  ('simulate-tournament', 'never_run')
ON CONFLICT (job_name) DO NOTHING;
