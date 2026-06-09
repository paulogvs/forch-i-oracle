# FORCH.i ORACLE — Domain Model

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **Prediction** | AI-generated analysis of a football match outcome |
| **Match Context** | Historical data about teams (last 5 matches, injuries, stats) |
| **Grounding** | Using real API data to inform Gemini's predictions |
| **Team Stats** | Win/loss/draw record, goals scored/conceded |
| **Injury Report** | List of unavailable players for a team |

## Domain Model
- **User** selects Home Team + Away Team
- **System** fetches real data from API-Football
- **Gemini** analyzes data and generates prediction
- **Result** includes: winner, score, confidence, analysis

## Constraints
- API-Football free tier: 100 requests/day
- Gemini free tier: 1,500 requests/day
- No historical World Cup data available in free tier
