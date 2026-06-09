---
name: groq-free-llm-backend
description: Use Groq (groq-sdk) with Llama 3.3 70B as a free LLM backend for AI apps — better rate limits than Gemini free tier
source: auto-skill
extracted_at: '2026-06-09T16:15:43.030Z'
---

## Why Groq over Gemini for free tier apps

Gemini's free tier was capped at **15 requests/minute** with aggressive quota enforcement. Groq offers **30 req/min** and **14,400 req/day** with the same free tier model, plus faster response times (~1-2s vs 3-5s).

## Migration pattern

### 1. Replace dependency
```bash
# Remove Gemini
npm remove @google/generative-ai
# Add Groq SDK
npm install groq-sdk
```

### 2. Rewrite the LLM client
```ts
// Before (Gemini):
import { GoogleGenerativeAI } from '@google/generative-ai';
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT });
const result = await model.generateContent(prompt);
const response = result.response.text();

// After (Groq):
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
  temperature: 0.3,
  max_tokens: 1024,
});
const response = result.choices[0]?.message?.content;
```

### 3. Update env var name
- `GEMINI_API_KEY` → `GROQ_API_KEY`
- Get key from: https://console.groq.com/keys

### 4. Handle model deprecations proactively
Gemini silently deprecated `gemini-1.5-flash` → `404 Not Found`. Always verify model names against current API docs before deploying. The error shows as:
```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

### 5. Vercel serverless rate-limiting caveat
**In-memory rate limiters (Map-based) don't work on Vercel serverless.** Each cold start creates a fresh container, so the Map resets. The rate limiter only works within a single container's lifetime (a few concurrent requests), making it effectively useless for production rate limiting.

**Solution:** Use a durable store like Upstash Redis, Vercel KV, or edge-based rate limiting middleware.

## Gotchas discovered

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `404 Not Found` on Gemini | Model deprecated by Google without notice | Switch to Groq, verify model names |
| Rate limiter always passes | Vercel serverless cold starts reset in-memory Map | Use Upstash Redis or Vercel KV |
| "Error generating prediction" (generic) | Catch-all swallows real error | Add specific error pattern matching and log `error.cause` |
| `getRecentForm` always shows W | Code checked `homeTeam.winner` regardless of which team was queried | Check if queried team was home or away, then determine W/D/L accordingly |
| Tests flaky in watch mode | Module state persists between test runs | Export `resetState()` function and call in `beforeEach` |
