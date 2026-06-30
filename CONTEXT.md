# FORCH.i ORACLE — Domain Model

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **Prediction** | AI-generated analysis of a football match outcome |
| **Match Context** | Historical data about teams (last 5 matches, injuries, stats) |
| **Grounding** | Using real API data to inform Groq Llama 3.3's predictions |
| **Team Stats** | Win/loss/draw record, goals scored/conceded |
| **Injury Report** | List of unavailable players for a team |
| **Lens** | A distinct analytical perspective (Statistical Engine, Recent Form, Squad Quality, Defensive Solidity, Home Advantage) |
| **Consensus** | Agreement across multiple lenses on which team is favored |
| **Multi-Sim** | Running 100 tournament simulations to calculate champion probability |

## Domain Model
- **User** selects Home Team + Away Team
- **System** fetches real data from API-Football
- **Statistical Engine** (Poisson + Elo + xG) calculates probabilities — numbers come from math, not LLM
- **Groq Llama 3.3 70B** writes tactical analysis narrative using pre-calculated stats
- **Result** includes: winner, score, confidence, analysis, key factors, form, player spotlights
- **Lens Consensus** shows 5 analytical perspectives with verdict and insight for each
- **Tournament Simulator** runs 100 simulations → Top 8 champion probability ranking

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  UI Layer (Next.js App Router)                  │
│  page.tsx, ResultCard, LensConsensus, Top8       │
├─────────────────────────────────────────────────┤
│  API Routes (/api/predict, /api/simulate)       │
│  Rate limiting, caching, error handling          │
├─────────────────────────────────────────────────┤
│  Statistical Engine (predictor-engine.ts)       │
│  Poisson distribution, Elo ratings, xG          │
├─────────────────────────────────────────────────┤
│  Data Layer (football-api.ts, teams.ts)         │
│  API-Football (real stats), Elo fallback        │
└─────────────────────────────────────────────────┘
```

## Constraints
- API-Football free tier: 100 requests/day
- No historical World Cup data available in free tier
- All timeouts: API-Football 5s, Groq 8s
- Cache window: 2 hours per team pair

## Teams
- 48 World Cup teams across 12 groups (A-L), 4 teams per group — OFFICIAL FIFA qualified teams
- Group A: México, Sudáfrica, Corea del Sur, Chequia
- All teams have: Elo rating, attack/defense strength, star players, English API name mapping
