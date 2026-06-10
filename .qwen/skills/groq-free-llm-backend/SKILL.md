---
name: groq-free-llm-backend
description: Use Groq (groq-sdk) with Llama 3.3 70B as a free LLM backend — with timeouts, text-only prompts, and fallback for Vercel serverless
source: auto-skill
extracted_at: '2026-06-10T15:22:52.683Z'
---

## Why Groq over Gemini for free tier apps

Gemini's free tier was capped at **15 requests/minute** with aggressive quota enforcement. Groq offers **30 req/min** and **14,400 req/day** with the same free tier model, plus faster response times (~1-2s vs 3-5s).

## Migration pattern

### 1. Replace dependency
```bash
npm remove @google/generative-ai
npm install groq-sdk
```

### 2. Rewrite the LLM client
```ts
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ],
  temperature: 0.3,
  max_tokens: 512,
});
const response = result.choices[0]?.message?.content;
```

### 3. Update env var name
- `GEMINI_API_KEY` → `GROQ_API_KEY`
- Get key from: https://console.groq.com/keys

## ⚡ Vercel Free Tier: 10s Hard Limit — Timeout Strategy

Vercel Hobby tier has a **10-second hard timeout** for serverless functions. Groq Llama 3.3 can take 3-15s depending on server load. You MUST implement timeouts:

```ts
// 8s timeout for Groq (leaves 2s buffer for Vercel's 10s limit)
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('GROQ_TIMEOUT')), 8000)
);

try {
  const result = await Promise.race([
    groq.chat.completions.create({ /* ... */ }),
    timeoutPromise,
  ]);
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('GROQ_TIMEOUT')) {
    // FALLBACK: return stats-based analysis without LLM
    return {
      analysis: `Análisis estadístico: ${homeTeam} tiene ${stats.homeWin}% de probabilidad...`,
      homeKeyPlayers: [],
      awayKeyPlayers: [],
    };
  }
}
```

### Optimized Groq settings for speed:
| Setting | Default | Optimized | Why |
|---------|---------|-----------|-----|
| `max_tokens` | 2048 | 512 | 75% less tokens = faster response |
| `temperature` | 0.7 | 0.3 | Lower = more deterministic = faster |
| Prompt scope | Full prediction | Text analysis only | LLM only writes narrative, not numbers |

## Text-Only Pattern: LLM Writes Analysis, Not Numbers

When you have a statistical prediction engine (see `statistical-prediction-engine` skill), the LLM should **only** write the narrative analysis:

```ts
const prompt = `Eres FORCH.i Oracle. Escribe el ANÁLISIS NARRATIVO de este partido.

Las probabilidades YA ESTÁN CALCULADAS por un modelo estadístico (Poisson + Elo).
Tu trabajo es explicar el POR QUÉ de estos números.

HOME: ${homeTeam}  |  AWAY: ${awayTeam}
- ${homeTeam} win: ${stats.homeWin}%
- Draw: ${stats.draw}%
- Most likely score: ${stats.predictedScoreHome}-${stats.predictedScoreAway}

INSTRUCTIONS:
- Write 3-5 sentences in Spanish.
- Explain why ${homeTeam} has ${stats.homeWin}% probability.
- DO NOT invent probabilities — they are calculated above.

Respond ONLY with JSON:
{"analysis": "...", "homeKeyPlayers": ["...", "..."], "awayKeyPlayers": ["...", "..."]}
`;
```

Parse with a simplified parser:
```ts
function parseGroqAnalysis(response: string): { analysis: string; homeKeyPlayers: string[]; awayKeyPlayers: string[] } {
  const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Análisis no disponible.',
      homeKeyPlayers: Array.isArray(parsed.homeKeyPlayers) ? parsed.homeKeyPlayers.map(String).slice(0, 2) : [],
      awayKeyPlayers: Array.isArray(parsed.awayKeyPlayers) ? parsed.awayKeyPlayers.map(String).slice(0, 2) : [],
    };
  } catch {
    return { analysis: response.substring(0, 500), homeKeyPlayers: [], awayKeyPlayers: [] };
  }
}
```

## Gotchas discovered

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `404 Not Found` on Gemini | Model deprecated by Google without notice | Switch to Groq, verify model names |
| Vercel timeout (10s) | Groq can take 15s under load | 8s timeout + fallback to stats-based analysis |
| Slow responses | max_tokens=2048, temp=0.7 | Reduce to 512 tokens, temp=0.3 |
| LLM invents numbers | Full prediction prompt | Text-only prompt + pass pre-calculated stats |
| Rate limiter always passes | Vercel serverless cold starts reset in-memory Map | Use Upstash Redis or Vercel KV |
| "Error generating prediction" (generic) | Catch-all swallows real error | Add specific error pattern matching |
