# FORCH.i ORACLE — Agent Instructions

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **AI:** Google Gemini 1.5 Flash
- **Data:** API-Football (free tier)

## Scripts
- `npm run dev` — Development server
- `npm run build` — Production build
- `npm start` — Production server

## Conventions
- Use `'use client'` for interactive components
- Lazy-initialize API clients (don't evaluate at module level)
- Use FORCH.i gold (#D4AF37) for accents
- Include "Built with FORCH.i by Paulo Velasco" badge

## API Keys Required
- `GEMINI_API_KEY` — Google AI Studio
- `FOOTBALL_API_KEY` — API-Football
