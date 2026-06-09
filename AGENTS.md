# FORCH.i ORACLE — Agent Instructions

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **AI:** Groq Llama 3.3 70B
- **Data:** API-Football (free tier)

## Scripts
- `npm run dev` — Development server
- `npm run build` — Production build
- `npm start` — Production server

## Components
- `MatchSelector.tsx` — WC2026 match picker (groups A-L)
- `TeamSelector.tsx` — Manual team dropdown
- `ResultCard.tsx` — Prediction display

## Data Files
- `lib/matches.ts` — 72 WC2026 group stage matches
- `lib/teams.ts` — 48 World Cup teams

## Conventions
- Use `'use client'` for interactive components
- Lazy-initialize API clients (don't evaluate at module level)
- Use FORCH.i gold (#D4AF37) for accents
- Include "Built with FORCH.i by Paulo Velasco" badge

## API Keys Required
- `GROQ_API_KEY` — Groq Console (https://console.groq.com/keys)
- `FOOTBALL_API_KEY` — API-Football
