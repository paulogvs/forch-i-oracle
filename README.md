# FORCH.i ORACLE ⚽🔮

AI-powered sports predictions for FIFA World Cup 2026 using Google Gemini + real-time data.

## Features

- 🏆 **Match Selector** — Browse all 72 WC2026 group stage matches across 12 groups (A-L)
- 🤖 **AI Predictions** — Google Gemini analyzes team stats, injuries, and match context
- 📊 **Real-time Data** — API-Football provides live team statistics and injury reports
- 🎨 **FORCH.i Brand** — Dark theme with gold accents (#D4AF37)

## How It Works

1. **Select a Match** — Choose from the World Cup schedule by group
2. **Or Pick Teams** — Manually select any two teams
3. **Get Prediction** — AI analyzes and predicts winner, score, and confidence

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **AI:** Google Gemini 1.5 Flash
- **Data:** API-Football (free tier)

## Getting Started

### Prerequisites
- Node.js 18+
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
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
GEMINI_API_KEY=your_gemini_key
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
│   ├── api/predict/route.ts     # API endpoint
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main UI
├── components/
│   ├── MatchSelector.tsx        # World Cup match picker
│   ├── ResultCard.tsx           # Prediction display
│   └── TeamSelector.tsx         # Team dropdown
├── lib/
│   ├── football-api.ts          # API-Football client
│   ├── gemini.ts                # Gemini AI client
│   ├── matches.ts               # WC2026 schedule (72 matches)
│   ├── rate-limit.ts            # API rate limiting
│   └── teams.ts                 # 48 World Cup teams
├── public/
│   ├── favicon.svg              # App icon
│   └── opengraph.svg            # Social preview
├── vercel.json                  # Vercel config
└── package.json
```

## World Cup 2026 Groups

| Group | Teams |
|-------|-------|
| A | Mexico, TBD, TBD, TBD |
| B | TBD, TBD, TBD, TBD |
| C | TBD, TBD, TBD, TBD |
| ... | ... |
| L | TBD, TBD, TBD, TBD |

*Full schedule with 72 matches available in-app*

## API Limits

| Service | Free Tier |
|---------|-----------|
| API-Football | 100 requests/day |
| Google Gemini | 1,500 requests/day |

## Built with

**FORCH.i** by Paulo Velasco — Bolivia 🇧🇴

## License

MIT
