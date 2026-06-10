# FORCH.i ORACLE ⚽🔮

AI-powered sports predictions for FIFA World Cup 2026 using Groq Llama 3.3 70B + real-time data + statistical engine (Poisson + Elo + xG).

## Features

- 🏆 **Match Selector** — Browse all 72 WC2026 group stage matches across 12 groups (A-L)
- 🏆 **Tournament Simulator** — Simulate the entire World Cup from groups to final (100 multi-simulations)
- 🤖 **AI Predictions** — Groq Llama 3.3 70B writes tactical analysis using pre-calculated statistical data
- 📊 **Real-time Data** — API-Football provides live team statistics, injury reports, and form
- 🔮 **Lens Consensus** — 5 analytical perspectives (Statistical Engine, Recent Form, Squad Quality, Defensive Solidity, Home Advantage) with verdict and insight
- 📋 **Rich Results** — Predicted score, confidence meter, key factors, form bubbles, comparison bars, star players
- 🏅 **Top 8 Champion Probability** — Probability ranking based on 100 tournament simulations with animated bars and count-up
- 🎨 **FORCH.i Brand** — Dark theme with gold accents (#D4AF37), smooth animations, glassmorphism

## How It Works

### Match Prediction Pipeline
```
1. Cache check (2-hour window)
2. Statistical Engine INSTANT — Poisson + Elo + xG calculates probabilities
3. API-Football (5s timeout) — real stats, form, injuries
4. Groq LLM (8s timeout) — writes narrative analysis ONLY (no number invention)
5. Merge statistical numbers + Groq text → Prediction object
6. Cache + response
```

### Tournament Simulation Pipeline
```
1. Run 100 independent simulations of full tournament
2. Each sim: Group stage (Poisson matches) → Knockout (R32 → Final)
3. Count champion frequency across all simulations
4. Top 8 ranking with probability percentages
5. Last simulation bracket displayed for detailed view
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **AI:** Groq Llama 3.3 70B (narrative analysis only)
- **Stats:** Poisson distribution + Elo ratings + Expected Goals (xG)
- **Data:** API-Football (free tier)
- **Testing:** Vitest

## Getting Started

### Prerequisites
- Node.js 18+
- Groq API key ([Get one here](https://console.groq.com/keys))
- API-Football key ([Get one here](https://www.api-football.com/pricing))

### Installation

```bash
git clone https://github.com/paulogvs/forch-i-oracle.git
cd forch-i-oracle
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Add your API keys:

```
GROQ_API_KEY=your_groq_key
FOOTBALL_API_KEY=your_football_key
```

### Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/paulogvs/forch-i-oracle)

## Project Structure

```
forch-i-oracle/
├── app/
│   ├── api/
│   │   ├── predict/route.ts              # Match prediction endpoint
│   │   └── simulate-tournament/route.ts  # Tournament multi-sim endpoint
│   ├── bracket/page.tsx                  # Tournament bracket + Top 8 ranking
│   ├── globals.css                       # Global styles
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Main prediction UI
├── components/
│   ├── MatchSelector.tsx                 # WC2026 match picker
│   ├── TeamSelector.tsx                  # Team dropdown with search
│   ├── ResultCard.tsx                    # Rich prediction display
│   ├── LensConsensus.tsx                 # 5 analytical perspectives + consensus
│   ├── Top8Ranking.tsx                   # Champion probability ranking
│   ├── ConfidenceMeter.tsx               # Confidence visualization
│   ├── FormBubbles.tsx                   # W/D/L form bubbles
│   ├── ComparisonBars.tsx                # Attack/midfield/defense comparison
│   ├── KeyFactors.tsx                    # Key factor analysis bars
│   ├── BracketMatch.tsx                  # Knockout match card
│   ├── ChampionReveal.tsx                # Champion reveal animation
│   ├── GroupTable.tsx                    # Group standings table
│   └── SimGroupStandings.tsx             # Simulated group standings
├── lib/
│   ├── groq.ts                           # Groq Llama 3.3 client + prompt
│   ├── football-api.ts                   # API-Football client
│   ├── predictor-engine.ts               # Statistical engine (Poisson + Elo + xG)
│   ├── tournament-sim.ts                 # Tournament simulation + multi-sim
│   ├── cache.ts                          # Server-side prediction cache
│   ├── rate-limit.ts                     # API rate limiting
│   ├── matches.ts                        # WC2026 schedule (72 group + knockout)
│   └── teams.ts                          # 48 World Cup teams with data
├── public/
│   ├── favicon.svg                       # App icon
│   └── opengraph.svg                     # Social preview
└── vercel.json                           # Vercel config
```

## World Cup 2026 Groups

| Group | Teams |
|-------|-------|
| A | México 🇲🇽, Sudáfrica 🇿🇦, Corea del Sur 🇰🇷, Chequia 🇨🇿 |
| B | Canadá 🇨🇦, Bosnia 🇧🇦, Qatar 🇶🇦, Suiza 🇨🇭 |
| C | Brasil 🇧🇷, Marruecos 🇲🇦, Haití 🇭🇹, Escocia 🏴 |
| D | EE.UU. 🇺🇸, Paraguay 🇵🇾, Australia 🇦🇺, Turquía 🇹🇷 |
| E | Alemania 🇩🇪, Curazao 🇨🇼, Costa de Marfil 🇨🇮, Ecuador 🇪🇨 |
| F | Países Bajos 🇳🇱, Japón 🇯🇵, Suecia 🇸🇪, Túnez 🇹🇳 |
| G | Bélgica 🇧🇪, Egipto 🇪🇬, Irán 🇮🇷, Nueva Zelanda 🇳🇿 |
| H | España 🇪🇸, Cabo Verde 🇨🇻, Arabia Saudita 🇸🇦, Uruguay 🇺🇾 |
| I | Francia 🇫🇷, Senegal 🇸🇳, Irak 🇮🇶, Noruega 🇳🇴 |
| J | Argentina 🇦🇷, Argelia 🇩🇿, Austria 🇦🇹, Jordania 🇯🇴 |
| K | Portugal 🇵🇹, RD Congo 🇨🇩, Uzbekistán 🇺🇿, Colombia 🇨🇴 |
| L | Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿, Croacia 🇭🇷, Ghana 🇬🇭, Panamá 🇵🇦 |

*48 teams · 72 group matches · Knockout: R32 → R16 → QF → SF → Final*

## API Limits

| Service | Free Tier |
|---------|-----------|
| API-Football | 100 requests/day |
| Groq Llama 3.3 | 14,400 requests/day |

## Built with

**FORCH.i** by Paulo Velasco — Bolivia 🇧🇴

## License

MIT
