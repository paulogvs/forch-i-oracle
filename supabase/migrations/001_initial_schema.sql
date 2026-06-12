-- ═══════════════════════════════════════════════════════════════
-- FORCH.i ORACLE — Clean Schema Rebuild
-- Version: 2.0
-- Date: 2026-06-11
-- 
-- INSTRUCTIONS:
-- 1. Run DROP section first (removes all old tables)
-- 2. Run CREATE section (creates new clean schema)
-- 3. Run SEED section (populates teams + matches)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: DROP ALL EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS cron_job_status CASCADE;
DROP TABLE IF EXISTS champion_probabilities CASCADE;
DROP TABLE IF EXISTS team_form CASCADE;
DROP TABLE IF EXISTS match_predictions CASCADE;
DROP TABLE IF EXISTS accuracy_metrics CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: CREATE NEW SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- ─── TEAMS ──────────────────────────────────────────────────
-- 48 World Cup teams with Elo, power ratings, and star players

CREATE TABLE teams (
  id TEXT PRIMARY KEY,                        -- Team name (e.g., 'Brasil')
  fifa_code TEXT NOT NULL,                    -- FIFA code (e.g., 'BRA')
  name TEXT NOT NULL,                         -- Display name
  english_name TEXT,                          -- English name for API lookups
  group_char TEXT,                            -- Group letter (A-L)
  confederation TEXT,                         -- FIFA confederation
  elo_rating FLOAT DEFAULT 1500,              -- Current Elo rating
  attack_rating FLOAT DEFAULT 1.0,            -- Attack strength multiplier
  defense_rating FLOAT DEFAULT 1.0,           -- Defense strength multiplier
  power_ratings JSONB DEFAULT '{"attack":50,"defense":50,"midfield":50}'::jsonb,
  star_players TEXT[] DEFAULT '{}',           -- 2-3 key players
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_fifa_code ON teams(fifa_code);
CREATE INDEX idx_teams_group ON teams(group_char);
CREATE INDEX idx_teams_elo ON teams(elo_rating DESC);

-- ─── MATCHES ────────────────────────────────────────────────
-- All 128 World Cup 2026 matches

CREATE TABLE matches (
  id TEXT PRIMARY KEY,                        -- Match ID (e.g., 'A1', 'R32-1', 'Final')
  match_number INTEGER,                       -- Sequential match number
  group_char TEXT,                            -- Group letter (A-L) or knockout round
  round TEXT DEFAULT 'group',                 -- 'group', 'round-32', 'round-16', 'quarter', 'semi', 'third', 'final'
  home_team_id TEXT NOT NULL,                 -- Home team name (FK to teams.id)
  away_team_id TEXT NOT NULL,                 -- Away team name (FK to teams.id)
  home_code TEXT,                             -- Home team FIFA code
  away_code TEXT,                             -- Away team FIFA code
  match_date TEXT,                            -- ISO date string (e.g., '2026-06-11')
  match_time TEXT,                            -- UTC time (e.g., '19:00')
  venue TEXT,                                 -- Stadium name
  city TEXT,                                  -- City name
  status TEXT DEFAULT 'scheduled',            -- 'scheduled', 'live', 'finished', 'cancelled'
  score_home INTEGER,                         -- Real home score (NULL if not played)
  score_away INTEGER,                         -- Real away score (NULL if not played)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_group ON matches(group_char);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);
CREATE INDEX idx_matches_round ON matches(round);

-- ─── MATCH PREDICTIONS ──────────────────────────────────────
-- Predictions for each match (one per model version)

CREATE TABLE match_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,                     -- Match ID (FK to matches.id)
  model_version TEXT NOT NULL DEFAULT '2.0',  -- Model version (for A/B testing)
  
  -- Core probabilities (0-100 scale)
  prob_team1_win FLOAT NOT NULL,              -- Home win probability
  prob_draw FLOAT NOT NULL,                   -- Draw probability
  prob_team2_win FLOAT NOT NULL,              -- Away win probability
  
  -- Score predictions
  most_likely_score TEXT,                     -- e.g., '2-1'
  expected_goals_team1 FLOAT,                 -- xG home
  expected_goals_team2 FLOAT,                 -- xG away
  
  -- Secondary markets
  over_25_probability FLOAT,                  -- Over 2.5 goals probability
  btts_probability FLOAT,                     -- Both teams to score probability
  
  -- Model metadata
  key_factors JSONB DEFAULT '[]'::jsonb,      -- Key factors affecting prediction
  confidence_score FLOAT,                     -- 0-100 (maps to alta/media/baja)
  data_quality_score FLOAT,                   -- 0-100 (input data quality)
  
  -- Enhanced engine fields
  home_attack INTEGER,
  home_defense INTEGER,
  home_midfield INTEGER,
  away_attack INTEGER,
  away_defense INTEGER,
  away_midfield INTEGER,
  home_elo INTEGER,
  away_elo INTEGER,
  momentum FLOAT,
  fatigue_impact FLOAT,
  home_advantage_bonus FLOAT,
  injury_penalty FLOAT,
  top_scores JSONB DEFAULT '[]'::jsonb,       -- [{home:2, away:1, prob:0.15}]
  
  -- Groq analysis (stored alongside prediction)
  analysis TEXT,                              -- Full Groq analysis text
  home_key_players TEXT[],                    -- Home team key players
  away_key_players TEXT[],                    -- Away team key players
  
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(match_id, model_version)
);

CREATE INDEX idx_predictions_match ON match_predictions(match_id);
CREATE INDEX idx_predictions_model ON match_predictions(model_version);
CREATE INDEX idx_predictions_confidence ON match_predictions(confidence_score DESC);

-- ─── TEAM FORM ──────────────────────────────────────────────
-- Recent form, momentum, xG, dynamic Elo per team

CREATE TABLE team_form (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,               -- Team name (FK to teams.id)
  last_5 JSONB DEFAULT '[]'::jsonb,           -- [{result, opponent, goalsFor, goalsAgainst, date}]
  xg_for FLOAT DEFAULT 1.2,                  -- Expected goals for (season average)
  xg_against FLOAT DEFAULT 1.0,              -- Expected goals against (season average)
  momentum FLOAT DEFAULT 0,                  -- -1.0 to +1.0
  matches_played INTEGER DEFAULT 0,
  elo_dynamic FLOAT DEFAULT 1500,            -- Dynamic Elo (updated after each match)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_form_team ON team_form(team_id);
CREATE INDEX idx_team_form_elo ON team_form(elo_dynamic DESC);

-- ─── CHAMPION PROBABILITIES ─────────────────────────────────
-- Tournament simulation results

CREATE TABLE champion_probabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,               -- Team name (FK to teams.id)
  probability FLOAT NOT NULL,                -- Champion probability (0-100)
  semifinalist_prob FLOAT,                   -- Semifinalist probability
  runner_up_prob FLOAT,                      -- Runner-up probability
  simulations_count INTEGER DEFAULT 100,     -- Number of sims where team won
  total_simulations INTEGER DEFAULT 100,     -- Total simulations run
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_champion_probs_team ON champion_probabilities(team_id);
CREATE INDEX idx_champion_probs_prob ON champion_probabilities(probability DESC);

-- ─── ACCURACY METRICS ───────────────────────────────────────
-- Track prediction accuracy for each match

CREATE TABLE accuracy_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,                     -- Match ID (FK to matches.id)
  predicted_home_win FLOAT,
  predicted_draw FLOAT,
  predicted_away_win FLOAT,
  actual_result TEXT,                         -- 'home' | 'draw' | 'away'
  predicted_correct BOOLEAN,
  brier_score FLOAT,                         -- Brier score for this match
  log_loss FLOAT,                            -- Log loss for this match
  model_version TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accuracy_match ON accuracy_metrics(match_id);
CREATE INDEX idx_accuracy_model ON accuracy_metrics(model_version);

-- ─── CRON JOB STATUS ───────────────────────────────────────
-- Track cron job execution status

CREATE TABLE cron_job_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL UNIQUE,              -- 'ingest', 'recalculate', 'simulate'
  last_run TIMESTAMPTZ,
  status TEXT,                               -- 'success', 'failed', 'running', 'never_run'
  duration_ms INTEGER,
  records_processed INTEGER,
  error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cron_job_name ON cron_job_status(job_name);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_form ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_probabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE accuracy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_status ENABLE ROW LEVEL SECURITY;

-- Public can read all data (for the app frontend)
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read predictions" ON match_predictions FOR SELECT USING (true);
CREATE POLICY "Public read team_form" ON team_form FOR SELECT USING (true);
CREATE POLICY "Public read champion_probs" ON champion_probabilities FOR SELECT USING (true);
CREATE POLICY "Public read accuracy" ON accuracy_metrics FOR SELECT USING (true);
CREATE POLICY "Public read cron_status" ON cron_job_status FOR SELECT USING (true);

-- Service role can do everything (API routes use service_role key)
-- No additional policies needed — service_role bypasses RLS

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: SEED INITIAL CRON STATUS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO cron_job_status (job_name, status) VALUES
  ('ingest', 'never_run'),
  ('recalculate', 'never_run'),
  ('simulate', 'never_run')
ON CONFLICT (job_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: SEED TEAMS (48 World Cup 2026 teams)
-- ═══════════════════════════════════════════════════════════════
-- Run the seed script AFTER this migration:
--   npx tsx scripts/seed-supabase.ts

-- Or paste this SQL block to seed teams directly:

INSERT INTO teams (id, fifa_code, name, english_name, group_char, confederation, elo_rating, attack_rating, defense_rating, power_ratings, star_players) VALUES
-- GROUP A
('México', 'MEX', 'México', 'Mexico', 'A', 'CONCACAF', 1945, 1.3, 1.0, '{"attack":74,"defense":72,"midfield":73}', ARRAY['Santiago Giménez','Edson Álvarez','Guillermo Ochoa']),
('Sudáfrica', 'RSA', 'Sudáfrica', 'South Africa', 'A', 'CAF', 1818, 0.9, 1.1, '{"attack":60,"defense":62,"midfield":58}', ARRAY['Percy Tau','Themba Zwane','Lyle Foster']),
('Corea del Sur', 'KOR', 'Corea del Sur', 'South Korea', 'A', 'AFC', 1918, 1.2, 1.0, '{"attack":76,"defense":72,"midfield":73}', ARRAY['Son Heung-min','Hwang Hee-chan','Kim Min-jae']),
('Chequia', 'CZE', 'Chequia', 'Czech Republic', 'A', 'UEFA', 1855, 1.1, 1.1, '{"attack":66,"defense":68,"midfield":67}', ARRAY['Patrik Schick','Tomáš Souček','Vladimír Coufal']),
-- GROUP B
('Canadá', 'CAN', 'Canadá', 'Canada', 'B', 'CONCACAF', 1832, 1.2, 1.2, '{"attack":68,"defense":62,"midfield":64}', ARRAY['Alphonso Davies','Jonathan David','Cyle Larin']),
('Bosnia y Herzegovina', 'BIH', 'Bosnia y Herzegovina', 'Bosnia and Herzegovina', 'B', 'UEFA', 1835, 1.0, 1.3, '{"attack":65,"defense":64,"midfield":63}', ARRAY['Edin Džeko','Miralem Pjanić','Rade Krunić']),
('Qatar', 'QAT', 'Qatar', 'Qatar', 'B', 'AFC', 1795, 0.9, 1.3, '{"attack":55,"defense":56,"midfield":54}', ARRAY['Akram Afif','Almoez Ali','Hassan Al-Haydos']),
('Suiza', 'SUI', 'Suiza', 'Switzerland', 'B', 'UEFA', 1932, 1.4, 1.0, '{"attack":72,"defense":76,"midfield":74}', ARRAY['Granit Xhaka','Manuel Akanji','Breel Embolo']),
-- GROUP C
('Brasil', 'BRA', 'Brasil', 'Brazil', 'C', 'CONMEBOL', 2103, 2.0, 0.9, '{"attack":94,"defense":85,"midfield":90}', ARRAY['Vinícius Jr.','Rodrygo','Marquinhos']),
('Marruecos', 'MAR', 'Marruecos', 'Morocco', 'C', 'CAF', 1988, 1.3, 0.7, '{"attack":80,"defense":86,"midfield":78}', ARRAY['Achraf Hakimi','Hakim Ziyech','Sofyan Amrabat']),
('Haití', 'HTI', 'Haití', 'Haiti', 'C', 'CONCACAF', 1762, 0.7, 1.4, '{"attack":52,"defense":52,"midfield":50}', ARRAY['Duckens Nazon','Wilde-Donald Guerrier','Carlens Arcus']),
('Escocia', 'SCO', 'Escocia', 'Scotland', 'C', 'UEFA', 1825, 1.2, 1.1, '{"attack":62,"defense":66,"midfield":63}', ARRAY['Andrew Robertson','John McGinn','Che Adams']),
-- GROUP D
('Estados Unidos', 'USA', 'Estados Unidos', 'USA', 'D', 'CONCACAF', 1935, 1.4, 1.1, '{"attack":73,"defense":71,"midfield":72}', ARRAY['Christian Pulisic','Tyler Adams','Weston McKennie']),
('Paraguay', 'PAR', 'Paraguay', 'Paraguay', 'D', 'CONMEBOL', 1848, 0.9, 1.1, '{"attack":64,"defense":68,"midfield":63}', ARRAY['Miguel Almirón','Gustavo Gómez','Julio Enciso']),
('Australia', 'AUS', 'Australia', 'Australia', 'D', 'AFC', 1889, 1.1, 1.0, '{"attack":67,"defense":70,"midfield":66}', ARRAY['Mathew Leckie','Riley McGree','Ajdin Hrustic']),
('Turquía', 'TUR', 'Turquía', 'Turkey', 'D', 'UEFA', 1885, 1.4, 1.3, '{"attack":72,"defense":68,"midfield":70}', ARRAY['Arda Güler','Hakan Çalhanoğlu','Kenan Yıldız']),
-- GROUP E
('Alemania', 'GER', 'Alemania', 'Germany', 'E', 'UEFA', 2061, 2.1, 0.9, '{"attack":91,"defense":87,"midfield":90}', ARRAY['Jamal Musiala','Florian Wirtz','Antonio Rüdiger']),
('Curazao', 'CUW', 'Curazao', 'Curacao', 'E', 'CONCACAF', 1745, 0.8, 1.4, '{"attack":50,"defense":48,"midfield":48}', ARRAY['Juninho Bacuna','Brandley Kuwas','Jarchinio Antonia']),
('Costa de Marfil', 'CIV', 'Costa de Marfil', 'Ivory Coast', 'E', 'CAF', 1808, 1.2, 1.2, '{"attack":65,"defense":60,"midfield":58}', ARRAY['Sébastien Haller','Franck Kessié','Wilfried Zaha']),
('Ecuador', 'ECU', 'Ecuador', 'Ecuador', 'E', 'CONMEBOL', 1912, 1.3, 1.0, '{"attack":72,"defense":74,"midfield":70}', ARRAY['Moisés Caicedo','Kendry Páez','Piero Hincapié']),
-- GROUP F
('Países Bajos', 'NED', 'Países Bajos', 'Netherlands', 'F', 'UEFA', 2058, 1.8, 0.8, '{"attack":89,"defense":88,"midfield":90}', ARRAY['Cody Gakpo','Virgil van Dijk','Xavi Simons']),
('Japón', 'JPN', 'Japón', 'Japan', 'F', 'AFC', 1978, 1.5, 0.9, '{"attack":79,"defense":78,"midfield":80}', ARRAY['Kaoru Mitoma','Takefusa Kubo','Wataru Endo']),
('Suecia', 'SWE', 'Suecia', 'Sweden', 'F', 'UEFA', 1862, 1.3, 1.2, '{"attack":68,"defense":70,"midfield":69}', ARRAY['Viktor Gyökeres','Alexander Isak','Dejan Kulusevski']),
('Túnez', 'TUN', 'Túnez', 'Tunisia', 'F', 'CAF', 1865, 1.0, 1.0, '{"attack":66,"defense":70,"midfield":67}', ARRAY['Wahbi Khazri','Ellyes Skhiri','Hannibal Mejbri']),
-- GROUP G
('Bélgica', 'BEL', 'Bélgica', 'Belgium', 'G', 'UEFA', 2044, 1.6, 1.0, '{"attack":88,"defense":82,"midfield":86}', ARRAY['Jérémy Doku','Romelu Lukaku','Youri Tielemans']),
('Egipto', 'EGY', 'Egipto', 'Egypt', 'G', 'CAF', 1878, 1.2, 1.1, '{"attack":72,"defense":68,"midfield":67}', ARRAY['Mohamed Salah','Mostafa Mohamed','Trezeguet']),
('Irán', 'IRN', 'Irán', 'Iran', 'G', 'AFC', 1895, 1.3, 0.9, '{"attack":68,"defense":72,"midfield":67}', ARRAY['Mehdi Taremi','Sardar Azmoun','Alireza Jahanbakhsh']),
('Nueva Zelanda', 'NZL', 'Nueva Zelanda', 'New Zealand', 'G', 'OFC', 1772, 0.8, 1.2, '{"attack":54,"defense":56,"midfield":52}', ARRAY['Chris Wood','Liberato Cacace','Joe Bell']),
-- GROUP H
('España', 'ESP', 'España', 'Spain', 'H', 'UEFA', 2087, 2.4, 0.8, '{"attack":92,"defense":88,"midfield":95}', ARRAY['Lamine Yamal','Pedri','Rodri']),
('Cabo Verde', 'CPV', 'Cabo Verde', 'Cape Verde', 'H', 'CAF', 1802, 0.8, 1.0, '{"attack":58,"defense":60,"midfield":57}', ARRAY['Bebé','Garry Rodrigues','Ryan Mendes']),
('Arabia Saudita', 'KSA', 'Arabia Saudita', 'Saudi Arabia', 'H', 'AFC', 1842, 1.0, 1.1, '{"attack":63,"defense":65,"midfield":64}', ARRAY['Salem Al-Dawsari','Saleh Al-Shehri','Mohammed Al-Owais']),
('Uruguay', 'URU', 'Uruguay', 'Uruguay', 'H', 'CONMEBOL', 2027, 1.6, 0.9, '{"attack":83,"defense":85,"midfield":82}', ARRAY['Federico Valverde','Darwin Núñez','Ronald Araújo']),
-- GROUP I
('Francia', 'FRA', 'Francia', 'France', 'I', 'UEFA', 2112, 2.3, 0.7, '{"attack":96,"defense":90,"midfield":92}', ARRAY['Kylian Mbappé','Aurélien Tchouaméni','William Saliba']),
('Senegal', 'SEN', 'Senegal', 'Senegal', 'I', 'CAF', 1908, 1.4, 0.9, '{"attack":75,"defense":76,"midfield":72}', ARRAY['Sadio Mané','Nicolas Jackson','Pape Matar Sarr']),
('Irak', 'IRQ', 'Irak', 'Iraq', 'I', 'AFC', 1778, 0.9, 1.2, '{"attack":57,"defense":56,"midfield":54}', ARRAY['Aymen Hussein','Mohammed Amin','Ali Adnan']),
('Noruega', 'NOR', 'Noruega', 'Norway', 'I', 'UEFA', 1924, 1.5, 1.3, '{"attack":80,"defense":70,"midfield":72}', ARRAY['Erling Haaland','Martin Ødegaard','Alexander Sørloth']),
-- GROUP J
('Argentina', 'ARG', 'Argentina', 'Argentina', 'J', 'CONMEBOL', 2127, 2.1, 0.6, '{"attack":95,"defense":88,"midfield":94}', ARRAY['Lionel Messi','Julián Álvarez','Enzo Fernández']),
('Argelia', 'ALG', 'Argelia', 'Algeria', 'J', 'CAF', 1872, 1.1, 1.0, '{"attack":70,"defense":69,"midfield":68}', ARRAY['Riyad Mahrez','Youcef Atal','Amine Gouiri']),
('Austria', 'AUT', 'Austria', 'Austria', 'J', 'UEFA', 1928, 1.5, 1.2, '{"attack":75,"defense":73,"midfield":74}', ARRAY['David Alaba','Marcel Sabitzer','Christoph Baumgartner']),
('Jordania', 'JOR', 'Jordania', 'Jordan', 'J', 'AFC', 1785, 0.9, 1.1, '{"attack":58,"defense":56,"midfield":55}', ARRAY['Musa Al-Taamari','Yazan Al-Naimat','Ali Olwan']),
-- GROUP K
('Portugal', 'POR', 'Portugal', 'Portugal', 'K', 'UEFA', 2069, 2.0, 0.8, '{"attack":93,"defense":86,"midfield":89}', ARRAY['Cristiano Ronaldo','Bruno Fernandes','Rúben Dias']),
('RD Congo', 'COD', 'RD Congo', 'DR Congo', 'K', 'CAF', 1758, 0.9, 1.3, '{"attack":56,"defense":55,"midfield":52}', ARRAY['Cédric Bakambu','Yoane Wissa','Arthur Masuaku']),
('Uzbekistán', 'UZB', 'Uzbekistán', 'Uzbekistan', 'K', 'AFC', 1768, 1.0, 1.2, '{"attack":55,"defense":54,"midfield":53}', ARRAY['Sardor Rashidov','Jaloliddin Masharipov','Odiljon Hamrobekov']),
('Colombia', 'COL', 'Colombia', 'Colombia', 'K', 'CONMEBOL', 2032, 1.7, 0.8, '{"attack":85,"defense":82,"midfield":84}', ARRAY['James Rodríguez','Luis Díaz','Jhon Arias']),
-- GROUP L
('Inglaterra', 'ENG', 'Inglaterra', 'England', 'L', 'UEFA', 2098, 1.9, 0.7, '{"attack":90,"defense":87,"midfield":91}', ARRAY['Jude Bellingham','Harry Kane','Bukayo Saka']),
('Croacia', 'CRO', 'Croacia', 'Croatia', 'L', 'UEFA', 1998, 1.4, 0.9, '{"attack":78,"defense":82,"midfield":88}', ARRAY['Luka Modrić','Joško Gvardiol','Marcelo Brozović']),
('Ghana', 'GHA', 'Ghana', 'Ghana', 'L', 'CAF', 1792, 1.1, 1.2, '{"attack":62,"defense":60,"midfield":59}', ARRAY['Mohammed Kudus','Thomas Partey','Inaki Williams']),
('Panamá', 'PAN', 'Panamá', 'Panama', 'L', 'CONCACAF', 1738, 0.8, 1.2, '{"attack":52,"defense":54,"midfield":50}', ARRAY['José Fajardo','César Blackman','Aníbal Godoy'])
ON CONFLICT (id) DO UPDATE SET
  fifa_code = EXCLUDED.fifa_code,
  name = EXCLUDED.name,
  english_name = EXCLUDED.english_name,
  group_char = EXCLUDED.group_char,
  confederation = EXCLUDED.confederation,
  elo_rating = EXCLUDED.elo_rating,
  attack_rating = EXCLUDED.attack_rating,
  defense_rating = EXCLUDED.defense_rating,
  power_ratings = EXCLUDED.power_ratings,
  star_players = EXCLUDED.star_players,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: SEED MATCHES (128 WC2026 matches)
-- ═══════════════════════════════════════════════════════════════
-- Run the seed script for matches:
--   npx tsx scripts/seed-supabase.ts

-- Or run this SQL to seed all 72 group stage matches:

INSERT INTO matches (id, match_number, group_char, round, home_team_id, away_team_id, home_code, away_code, match_date, match_time, venue, city, status) VALUES
-- GROUP A
('A1', 1, 'A', 'group', 'México', 'Sudáfrica', 'MEX', 'RSA', '2026-06-11', '19:00', 'Estadio Azteca', 'Mexico City', 'scheduled'),
('A3', 2, 'A', 'group', 'Corea del Sur', 'Chequia', 'KOR', 'CZE', '2026-06-12', '02:00', 'Estadio Akron', 'Guadalajara', 'scheduled'),
('A2', 3, 'A', 'group', 'Chequia', 'Sudáfrica', 'CZE', 'RSA', '2026-06-18', '16:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('A4', 4, 'A', 'group', 'México', 'Corea del Sur', 'MEX', 'KOR', '2026-06-19', '01:00', 'Estadio Akron', 'Guadalajara', 'scheduled'),
('A5', 5, 'A', 'group', 'Chequia', 'México', 'CZE', 'MEX', '2026-06-25', '01:00', 'Estadio Azteca', 'Mexico City', 'scheduled'),
('A6', 6, 'A', 'group', 'Sudáfrica', 'Corea del Sur', 'RSA', 'KOR', '2026-06-25', '01:00', 'Estadio BBVA', 'Monterrey', 'scheduled'),
-- GROUP B
('B1', 7, 'B', 'group', 'Canadá', 'Bosnia y Herzegovina', 'CAN', 'BIH', '2026-06-12', '19:00', 'BMO Field', 'Toronto', 'scheduled'),
('B3', 8, 'B', 'group', 'Qatar', 'Suiza', 'QAT', 'SUI', '2026-06-13', '16:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('B2', 9, 'B', 'group', 'Suiza', 'Bosnia y Herzegovina', 'SUI', 'BIH', '2026-06-18', '16:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('B4', 10, 'B', 'group', 'Canadá', 'Qatar', 'CAN', 'QAT', '2026-06-18', '19:00', 'BC Place', 'Vancouver', 'scheduled'),
('B5', 11, 'B', 'group', 'Suiza', 'Canadá', 'SUI', 'CAN', '2026-06-24', '16:00', 'BC Place', 'Vancouver', 'scheduled'),
('B6', 12, 'B', 'group', 'Bosnia y Herzegovina', 'Qatar', 'BIH', 'QAT', '2026-06-24', '16:00', 'Lumen Field', 'Seattle', 'scheduled'),
-- GROUP C
('C1', 13, 'C', 'group', 'Brasil', 'Marruecos', 'BRA', 'MAR', '2026-06-13', '22:00', 'MetLife Stadium', 'New York', 'scheduled'),
('C3', 14, 'C', 'group', 'Haití', 'Escocia', 'HTI', 'SCO', '2026-06-14', '01:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('C2', 15, 'C', 'group', 'Escocia', 'Marruecos', 'SCO', 'MAR', '2026-06-20', '00:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('C4', 16, 'C', 'group', 'Brasil', 'Haití', 'BRA', 'HTI', '2026-06-20', '00:30', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('C5', 17, 'C', 'group', 'Escocia', 'Brasil', 'SCO', 'BRA', '2026-06-25', '00:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('C6', 18, 'C', 'group', 'Marruecos', 'Haití', 'MAR', 'HTI', '2026-06-25', '00:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
-- GROUP D
('D1', 19, 'D', 'group', 'Estados Unidos', 'Paraguay', 'USA', 'PAR', '2026-06-12', '22:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('D3', 20, 'D', 'group', 'Australia', 'Turquía', 'AUS', 'TUR', '2026-06-14', '01:00', 'BC Place', 'Vancouver', 'scheduled'),
('D2', 21, 'D', 'group', 'Estados Unidos', 'Australia', 'USA', 'AUS', '2026-06-19', '16:00', 'Lumen Field', 'Seattle', 'scheduled'),
('D4', 22, 'D', 'group', 'Turquía', 'Paraguay', 'TUR', 'PAR', '2026-06-20', '00:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('D5', 23, 'D', 'group', 'Turquía', 'Estados Unidos', 'TUR', 'USA', '2026-06-26', '01:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('D6', 24, 'D', 'group', 'Paraguay', 'Australia', 'PAR', 'AUS', '2026-06-26', '01:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
-- GROUP E
('E1', 25, 'E', 'group', 'Alemania', 'Curazao', 'GER', 'CUW', '2026-06-14', '16:00', 'NRG Stadium', 'Houston', 'scheduled'),
('E3', 26, 'E', 'group', 'Costa de Marfil', 'Ecuador', 'CIV', 'ECU', '2026-06-14', '23:00', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('E2', 27, 'E', 'group', 'Alemania', 'Costa de Marfil', 'GER', 'CIV', '2026-06-20', '20:00', 'BMO Field', 'Toronto', 'scheduled'),
('E4', 28, 'E', 'group', 'Ecuador', 'Curazao', 'ECU', 'CUW', '2026-06-21', '01:00', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),
('E5', 29, 'E', 'group', 'Curazao', 'Costa de Marfil', 'CUW', 'CIV', '2026-06-25', '20:00', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('E6', 30, 'E', 'group', 'Ecuador', 'Alemania', 'ECU', 'GER', '2026-06-25', '20:00', 'MetLife Stadium', 'New York', 'scheduled'),
-- GROUP F
('F1', 31, 'F', 'group', 'Países Bajos', 'Japón', 'NED', 'JPN', '2026-06-14', '19:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('F3', 32, 'F', 'group', 'Suecia', 'Túnez', 'SWE', 'TUN', '2026-06-15', '00:00', 'Estadio BBVA', 'Monterrey', 'scheduled'),
('F2', 33, 'F', 'group', 'Países Bajos', 'Suecia', 'NED', 'SWE', '2026-06-20', '16:00', 'NRG Stadium', 'Houston', 'scheduled'),
('F4', 34, 'F', 'group', 'Túnez', 'Japón', 'TUN', 'JPN', '2026-06-21', '04:00', 'Estadio BBVA', 'Monterrey', 'scheduled'),
('F5', 35, 'F', 'group', 'Japón', 'Suecia', 'JPN', 'SWE', '2026-06-26', '00:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('F6', 36, 'F', 'group', 'Túnez', 'Países Bajos', 'TUN', 'NED', '2026-06-26', '00:00', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),
-- GROUP G
('G1', 37, 'G', 'group', 'Bélgica', 'Egipto', 'BEL', 'EGY', '2026-06-15', '16:00', 'Lumen Field', 'Seattle', 'scheduled'),
('G3', 38, 'G', 'group', 'Irán', 'Nueva Zelanda', 'IRN', 'NZL', '2026-06-16', '00:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('G2', 39, 'G', 'group', 'Bélgica', 'Irán', 'BEL', 'IRN', '2026-06-21', '16:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('G4', 40, 'G', 'group', 'Nueva Zelanda', 'Egipto', 'NZL', 'EGY', '2026-06-22', '00:00', 'BC Place', 'Vancouver', 'scheduled'),
('G5', 41, 'G', 'group', 'Egipto', 'Irán', 'EGY', 'IRN', '2026-06-27', '00:00', 'Lumen Field', 'Seattle', 'scheduled'),
('G6', 42, 'G', 'group', 'Nueva Zelanda', 'Bélgica', 'NZL', 'BEL', '2026-06-27', '00:00', 'BC Place', 'Vancouver', 'scheduled'),
-- GROUP H
('H1', 43, 'H', 'group', 'España', 'Cabo Verde', 'ESP', 'CPV', '2026-06-15', '16:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('H3', 44, 'H', 'group', 'Arabia Saudita', 'Uruguay', 'KSA', 'URU', '2026-06-15', '22:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('H2', 45, 'H', 'group', 'España', 'Arabia Saudita', 'ESP', 'KSA', '2026-06-21', '16:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('H4', 46, 'H', 'group', 'Uruguay', 'Cabo Verde', 'URU', 'CPV', '2026-06-21', '22:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('H5', 47, 'H', 'group', 'Cabo Verde', 'Arabia Saudita', 'CPV', 'KSA', '2026-06-26', '23:00', 'NRG Stadium', 'Houston', 'scheduled'),
('H6', 48, 'H', 'group', 'Uruguay', 'España', 'URU', 'ESP', '2026-06-27', '00:00', 'Estadio Akron', 'Guadalajara', 'scheduled'),
-- GROUP I
('I1', 49, 'I', 'group', 'Francia', 'Senegal', 'FRA', 'SEN', '2026-06-16', '19:00', 'MetLife Stadium', 'New York', 'scheduled'),
('I3', 50, 'I', 'group', 'Irak', 'Noruega', 'IRQ', 'NOR', '2026-06-16', '22:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('I2', 51, 'I', 'group', 'Francia', 'Irak', 'FRA', 'IRQ', '2026-06-22', '21:00', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('I4', 52, 'I', 'group', 'Noruega', 'Senegal', 'NOR', 'SEN', '2026-06-23', '00:00', 'MetLife Stadium', 'New York', 'scheduled'),
('I5', 53, 'I', 'group', 'Noruega', 'Francia', 'NOR', 'FRA', '2026-06-26', '19:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('I6', 54, 'I', 'group', 'Senegal', 'Irak', 'SEN', 'IRQ', '2026-06-26', '19:00', 'BMO Field', 'Toronto', 'scheduled'),
-- GROUP J
('J1', 55, 'J', 'group', 'Argentina', 'Argelia', 'ARG', 'ALG', '2026-06-17', '00:00', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),
('J3', 56, 'J', 'group', 'Austria', 'Jordania', 'AUT', 'JOR', '2026-06-17', '01:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('J2', 57, 'J', 'group', 'Argentina', 'Austria', 'ARG', 'AUT', '2026-06-22', '16:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('J4', 58, 'J', 'group', 'Jordania', 'Argelia', 'JOR', 'ALG', '2026-06-23', '00:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('J5', 59, 'J', 'group', 'Argelia', 'Austria', 'ALG', 'AUT', '2026-06-28', '01:00', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),
('J6', 60, 'J', 'group', 'Jordania', 'Argentina', 'JOR', 'ARG', '2026-06-28', '01:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
-- GROUP K
('K1', 61, 'K', 'group', 'Portugal', 'RD Congo', 'POR', 'COD', '2026-06-17', '16:00', 'NRG Stadium', 'Houston', 'scheduled'),
('K3', 62, 'K', 'group', 'Uzbekistán', 'Colombia', 'UZB', 'COL', '2026-06-18', '00:00', 'Estadio Azteca', 'Mexico City', 'scheduled'),
('K2', 63, 'K', 'group', 'Portugal', 'Uzbekistán', 'POR', 'UZB', '2026-06-23', '16:00', 'NRG Stadium', 'Houston', 'scheduled'),
('K4', 64, 'K', 'group', 'Colombia', 'RD Congo', 'COL', 'COD', '2026-06-24', '00:00', 'Estadio Akron', 'Guadalajara', 'scheduled'),
('K5', 65, 'K', 'group', 'Colombia', 'Portugal', 'COL', 'POR', '2026-06-27', '23:30', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('K6', 66, 'K', 'group', 'RD Congo', 'Uzbekistán', 'COD', 'UZB', '2026-06-27', '23:30', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
-- GROUP L
('L1', 67, 'L', 'group', 'Inglaterra', 'Croacia', 'ENG', 'CRO', '2026-06-17', '19:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('L3', 68, 'L', 'group', 'Ghana', 'Panamá', 'GHA', 'PAN', '2026-06-17', '23:00', 'BMO Field', 'Toronto', 'scheduled'),
('L2', 69, 'L', 'group', 'Inglaterra', 'Ghana', 'ENG', 'GHA', '2026-06-23', '20:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('L4', 70, 'L', 'group', 'Panamá', 'Croacia', 'PAN', 'CRO', '2026-06-23', '23:00', 'BMO Field', 'Toronto', 'scheduled'),
('L5', 71, 'L', 'group', 'Panamá', 'Inglaterra', 'PAN', 'ENG', '2026-06-27', '21:00', 'MetLife Stadium', 'New York', 'scheduled'),
('L6', 72, 'L', 'group', 'Croacia', 'Ghana', 'CRO', 'GHA', '2026-06-27', '21:00', 'Lincoln Financial Field', 'Philadelphia', 'scheduled')
ON CONFLICT (id) DO UPDATE SET
  match_number = EXCLUDED.match_number,
  group_char = EXCLUDED.group_char,
  round = EXCLUDED.round,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_code = EXCLUDED.home_code,
  away_code = EXCLUDED.away_code,
  match_date = EXCLUDED.match_date,
  match_time = EXCLUDED.match_time,
  venue = EXCLUDED.venue,
  city = EXCLUDED.city,
  status = EXCLUDED.status;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: SEED KNOCKOUT MATCHES (56 matches)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO matches (id, match_number, group_char, round, home_team_id, away_team_id, home_code, away_code, match_date, match_time, venue, city, status) VALUES
-- ROUND OF 32 (16 matches)
('R32-1', 73, 'R32', 'round-32', '1A', '3B/3E/3F/3G', '', '', '2026-06-28', '16:00', 'MetLife Stadium', 'New York', 'scheduled'),
('R32-2', 74, 'R32', 'round-32', '1C', '3A/3B/3C/3D', '', '', '2026-06-28', '18:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('R32-3', 75, 'R32', 'round-32', '1E', '3D/3E/3F', '', '', '2026-06-28', '20:00', 'NRG Stadium', 'Houston', 'scheduled'),
('R32-4', 76, 'R32', 'round-32', '1G', '3C/3G/3H', '', '', '2026-06-28', '22:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('R32-5', 77, 'R32', 'round-32', '1B', '3A/3B/3C', '', '', '2026-06-29', '16:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('R32-6', 78, 'R32', 'round-32', '1D', '3D/3E/3F', '', '', '2026-06-29', '18:00', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('R32-7', 79, 'R32', 'round-32', '1F', '3A/3B/3C', '', '', '2026-06-29', '20:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('R32-8', 80, 'R32', 'round-32', '1H', '3G/3H/3A', '', '', '2026-06-29', '22:00', 'Estadio Azteca', 'Mexico City', 'scheduled'),
('R32-9', 81, 'R32', 'round-32', '2A', '2B', '', '', '2026-06-30', '16:00', 'MetLife Stadium', 'New York', 'scheduled'),
('R32-10', 82, 'R32', 'round-32', '2C', '2D', '', '', '2026-06-30', '18:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('R32-11', 83, 'R32', 'round-32', '2E', '2F', '', '', '2026-06-30', '20:00', 'NRG Stadium', 'Houston', 'scheduled'),
('R32-12', 84, 'R32', 'round-32', '2G', '2H', '', '', '2026-06-30', '22:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('R32-13', 85, 'R32', 'round-32', '1I', '3I/3J/3K/3L', '', '', '2026-07-01', '16:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('R32-14', 86, 'R32', 'round-32', '1J', '3I/3J/3K/3L', '', '', '2026-07-01', '18:00', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),
('R32-15', 87, 'R32', 'round-32', '1K', '3K/3L/3I', '', '', '2026-07-01', '20:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('R32-16', 88, 'R32', 'round-32', '1L', '3J/3K/3L', '', '', '2026-07-01', '22:00', 'BMO Field', 'Toronto', 'scheduled'),
-- ROUND OF 16 (8 matches)
('R16-1', 89, 'R16', 'round-16', 'W-R32-1', 'W-R32-2', '', '', '2026-07-04', '16:00', 'MetLife Stadium', 'New York', 'scheduled'),
('R16-2', 90, 'R16', 'round-16', 'W-R32-3', 'W-R32-4', '', '', '2026-07-04', '18:00', 'NRG Stadium', 'Houston', 'scheduled'),
('R16-3', 91, 'R16', 'round-16', 'W-R32-5', 'W-R32-6', '', '', '2026-07-04', '20:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('R16-4', 92, 'R16', 'round-16', 'W-R32-7', 'W-R32-8', '', '', '2026-07-04', '22:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('R16-5', 93, 'R16', 'round-16', 'W-R32-9', 'W-R32-10', '', '', '2026-07-05', '16:00', 'Mercedes-Benz Stadium', 'Atlanta', 'scheduled'),
('R16-6', 94, 'R16', 'round-16', 'W-R32-11', 'W-R32-12', '', '', '2026-07-05', '18:00', 'SoFi Stadium', 'Los Angeles', 'scheduled'),
('R16-7', 95, 'R16', 'round-16', 'W-R32-13', 'W-R32-14', '', '', '2026-07-05', '20:00', 'Gillette Stadium', 'Boston', 'scheduled'),
('R16-8', 96, 'R16', 'round-16', 'W-R32-15', 'W-R32-16', '', '', '2026-07-05', '22:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
-- QUARTERFINALS (4 matches)
('QF-1', 97, 'QF', 'quarter', 'W-R16-1', 'W-R16-2', '', '', '2026-07-09', '19:00', 'MetLife Stadium', 'New York', 'scheduled'),
('QF-2', 98, 'QF', 'quarter', 'W-R16-3', 'W-R16-4', '', '', '2026-07-09', '22:00', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('QF-3', 99, 'QF', 'quarter', 'W-R16-5', 'W-R16-6', '', '', '2026-07-10', '19:00', 'NRG Stadium', 'Houston', 'scheduled'),
('QF-4', 100, 'QF', 'quarter', 'W-R16-7', 'W-R16-8', '', '', '2026-07-10', '22:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
-- SEMIFINALS (2 matches)
('SF-1', 101, 'SF', 'semi', 'W-QF-1', 'W-QF-2', '', '', '2026-07-14', '19:00', 'AT&T Stadium', 'Dallas', 'scheduled'),
('SF-2', 102, 'SF', 'semi', 'W-QF-3', 'W-QF-4', '', '', '2026-07-15', '19:00', 'MetLife Stadium', 'New York', 'scheduled'),
-- THIRD PLACE & FINAL
('3rd', 103, 'Final', 'third', 'L-SF-1', 'L-SF-2', '', '', '2026-07-18', '18:00', 'Hard Rock Stadium', 'Miami', 'scheduled'),
('Final', 104, 'Final', 'final', 'W-SF-1', 'W-SF-2', '', '', '2026-07-19', '17:00', 'MetLife Stadium', 'New York', 'scheduled')
ON CONFLICT (id) DO UPDATE SET
  match_number = EXCLUDED.match_number,
  group_char = EXCLUDED.group_char,
  round = EXCLUDED.round,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  match_date = EXCLUDED.match_date,
  match_time = EXCLUDED.match_time,
  venue = EXCLUDED.venue,
  city = EXCLUDED.city,
  status = EXCLUDED.status;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Run these to verify the migration:

-- Check table count
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check team count
SELECT COUNT(*) as team_count FROM teams;

-- Check match count
SELECT COUNT(*) as match_count FROM matches;

-- Check matches by round
SELECT round, COUNT(*) as count 
FROM matches 
GROUP BY round 
ORDER BY count DESC;

-- Check teams by group
SELECT group_char, COUNT(*) as count 
FROM teams 
GROUP BY group_char 
ORDER BY group_char;

-- ═══════════════════════════════════════════════════════════════
-- DONE! Schema rebuild complete.
-- Next: Run the app and verify data loads correctly.
-- ═══════════════════════════════════════════════════════════════
