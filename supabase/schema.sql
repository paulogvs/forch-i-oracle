-- ============================================================
-- FORCH.i ORACLE — Supabase Schema (PostgreSQL)
-- ============================================================
-- Run this SQL in your Supabase project's SQL Editor.
-- Creates all tables needed for the prediction pipeline.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA 1: teams — Datos base de los 48 equipos
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fifa_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    group_char CHAR(1) NOT NULL,
    confederation TEXT,
    elo_rating DECIMAL(6,2) DEFAULT 1500,
    power_ratings JSONB DEFAULT '{"attack": 50, "defense": 50, "midfield": 50}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_char);
CREATE INDEX IF NOT EXISTS idx_teams_fifa_code ON teams(fifa_code);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- ============================================================
-- TABLA 2: matches — Calendario de 128 partidos
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_number INTEGER UNIQUE,
    group_char CHAR(1),
    round TEXT NOT NULL CHECK (round IN ('group', 'R32', 'R16', 'QF', 'SF', 'F')),
    home_team_id TEXT NOT NULL,
    away_team_id TEXT NOT NULL,
    match_date DATE,
    match_time TEXT,
    venue TEXT,
    city TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
    score_home INTEGER,
    score_away INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_char);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(home_team_id, away_team_id);

-- ============================================================
-- TABLA 3: match_predictions — Predicciones pre-calculadas
-- ============================================================

CREATE TABLE IF NOT EXISTS match_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    prob_team1_win DECIMAL(5,2) NOT NULL DEFAULT 40,
    prob_draw DECIMAL(5,2) NOT NULL DEFAULT 30,
    prob_team2_win DECIMAL(5,2) NOT NULL DEFAULT 30,
    most_likely_score TEXT DEFAULT '1-1',
    expected_goals_team1 DECIMAL(4,2) DEFAULT 1.2,
    expected_goals_team2 DECIMAL(4,2) DEFAULT 1.0,
    over_25_probability DECIMAL(5,2) DEFAULT 50,
    btts_probability DECIMAL(5,2) DEFAULT 45,
    key_factors JSONB DEFAULT '[]',
    confidence_score DECIMAL(5,2) DEFAULT 50,
    data_quality_score DECIMAL(5,2) DEFAULT 30,
    model_version TEXT DEFAULT '2.0',
    -- Enhanced engine fields
    momentum DECIMAL(4,2),
    fatigue_impact DECIMAL(4,2),
    home_advantage_bonus DECIMAL(4,2),
    injury_penalty DECIMAL(4,2),
    home_attack INTEGER,
    home_defense INTEGER,
    home_midfield INTEGER,
    away_attack INTEGER,
    away_defense INTEGER,
    away_midfield INTEGER,
    home_elo INTEGER,
    away_elo INTEGER,
    top_scores JSONB,
    -- Groq analysis (stored alongside for convenience)
    analysis TEXT,
    home_key_players TEXT[],
    away_key_players TEXT[],
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_prediction UNIQUE (match_id, model_version)
);

CREATE INDEX IF NOT EXISTS idx_predictions_match ON match_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_predicted ON match_predictions(predicted_at);

-- ============================================================
-- TABLA 4: team_form — Forma reciente y stats dinámicas
-- ============================================================

CREATE TABLE IF NOT EXISTS team_form (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL,
    last_5 JSONB DEFAULT '[]',
    xg_for DECIMAL(4,2) DEFAULT 0,
    xg_against DECIMAL(4,2) DEFAULT 0,
    momentum DECIMAL(4,2) DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    elo_dynamic DECIMAL(6,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_form UNIQUE (team_id)
);

CREATE INDEX IF NOT EXISTS idx_form_team ON team_form(team_id);

-- ============================================================
-- TABLA 5: champion_probabilities — Simulaciones de torneo
-- ============================================================

CREATE TABLE IF NOT EXISTS champion_probabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL,
    probability DECIMAL(5,2) NOT NULL DEFAULT 0,
    simulations_count INTEGER DEFAULT 0,
    total_simulations INTEGER DEFAULT 100,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_champion_prob UNIQUE (team_id)
);

CREATE INDEX IF NOT EXISTS idx_probs_team ON champion_probabilities(team_id);
CREATE INDEX IF NOT EXISTS idx_probs_prob ON champion_probabilities(probability DESC);

-- ============================================================
-- TABLA 6: cron_job_status — Estado de jobs programados
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_job_status (
    job_name TEXT PRIMARY KEY,
    last_run TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'running', 'pending')),
    duration_ms INTEGER,
    records_processed INTEGER,
    error TEXT
);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Auto-update updated_at on teams
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on team_form
CREATE TRIGGER update_team_form_updated_at
    BEFORE UPDATE ON team_form
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Optional but recommended
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_form ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_probabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_status ENABLE ROW LEVEL SECURITY;

-- Public read policy (for the webapp)
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON match_predictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON team_form FOR SELECT USING (true);
CREATE POLICY "Public read access" ON champion_probabilities FOR SELECT USING (true);

-- Service key write policy (for API routes and cron jobs)
-- These use the service_role key which bypasses RLS by default
-- But if you want explicit policies:
CREATE POLICY "Service write teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write predictions" ON match_predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write team_form" ON team_form FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write champion_probabilities" ON champion_probabilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write cron_status" ON cron_job_status FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- COMMENTARIOS
-- ============================================================

COMMENT ON TABLE teams IS '48 World Cup teams with Elo ratings and power ratings';
COMMENT ON TABLE matches IS '128 WC2026 matches (72 group + 56 knockout)';
COMMENT ON TABLE match_predictions IS 'Pre-calculated predictions for each match';
COMMENT ON TABLE team_form IS 'Recent form and dynamic stats for each team';
COMMENT ON TABLE champion_probabilities IS 'Champion probabilities from tournament simulations';
COMMENT ON TABLE cron_job_status IS 'Status tracking for scheduled cron jobs';
