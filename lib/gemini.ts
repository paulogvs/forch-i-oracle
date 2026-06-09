// FORCH.i ORACLE — Gemini 2.0 Flash client with Grounding
import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy init — no crash at build time without .env.local
function getGenAI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY not configured in .env.local');
  }
  return new GoogleGenerativeAI(API_KEY);
}

// System prompt for sports analysis
const SYSTEM_PROMPT = `You are an elite world-class sports analyst specialized in international football.
Your name is FORCH.i Oracle.

You MUST use your Google Search tool to find CURRENT information about both teams:
1. CURRENT INJURIES of key players
2. RECENT CARDS AND BOOKINGS that may affect lineups
3. LIKELY LINEUPS from each team's last match
4. RECENT FORM — results from the last 5 official matches
5. HEAD-TO-HEAD history between both teams
6. RELEVANT NEWS — coaching changes, internal conflicts, motivation

After researching, calculate probability percentages:
- homeWin: home team win probability (0-100)
- draw: draw probability (0-100)
- awayWin: away team win probability (0-100)

And write a TACTICAL ANALYSIS of 3-5 sentences covering:
- Expected formation and playing style
- Key players to watch
- Strengths and weaknesses of each team
- Home advantage and team morale
- Qualitative match prediction

IMPORTANT: Respond ONLY with this exact JSON format (no markdown, no code fences, no extra text):
{"homeWin": 55, "draw": 25, "awayWin": 20, "analysis": "Your analysis text here."}`;

export interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  analysis: string;
}

interface MatchContext {
  id: string;
  group: string;
  matchday: number;
  date: string;
  time: string;
  venue: string;
  city: string;
}

/**
 * Build a match context block for the prompt
 */
function buildMatchContextBlock(ctx: MatchContext | null): string {
  if (!ctx) return '';

  const dateFormatted = new Date(`${ctx.date}T${ctx.time}:00Z`).toLocaleDateString(
    'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return `
MATCH CONTEXT (FIFA World Cup 2026 Group Stage):
- Group: ${ctx.group}
- Matchday: ${ctx.matchday} of 3
- Date: ${dateFormatted} at ${ctx.time} UTC
- Venue: ${ctx.venue}, ${ctx.city}
- This is a GROUP STAGE match — every point matters for qualification.
- Top 2 from each group advance directly; best 3rd-place teams also qualify.
`;
}

/**
 * Safely parse JSON from Gemini response, handling markdown fences
 */
export function parseGeminiJson(response: string): Prediction {
  // Strip markdown code fences if present
  const cleaned = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    return validatePrediction(parsed, 'direct parse');
  } catch {
    // Fall back to regex extraction
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validatePrediction(parsed, 'regex extraction');
      } catch {
        // Second regex attempt with more aggressive cleaning
        const aggressiveMatch = response.match(/\{[\s\S]*?\}/);
        if (aggressiveMatch) {
          try {
            const parsed = JSON.parse(aggressiveMatch[0]);
            return validatePrediction(parsed, 'aggressive extraction');
          } catch {
            // Fall through to final error
          }
        }
      }
    }
    throw new Error(`Could not parse Gemini response: ${response.substring(0, 200)}`);
  }
}

/**
 * Validate and normalize parsed prediction
 */
export function validatePrediction(parsed: Record<string, unknown>, source: string): Prediction {
  const homeWin = Number(parsed.homeWin);
  const draw = Number(parsed.draw);
  const awayWin = Number(parsed.awayWin);

  if (isNaN(homeWin) || isNaN(draw) || isNaN(awayWin)) {
    throw new Error(`Invalid prediction values from ${source}: homeWin=${parsed.homeWin}, draw=${parsed.draw}, awayWin=${parsed.awayWin}`);
  }

  return {
    homeWin: Math.max(0, Math.min(100, Math.round(homeWin))),
    draw: Math.max(0, Math.min(100, Math.round(draw))),
    awayWin: Math.max(0, Math.min(100, Math.round(awayWin))),
    analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Analysis not available.',
  };
}

/**
 * Generate a prediction using Gemini 2.0 Flash with Google Search Grounding
 */
export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  contextData: string,
  matchContext: MatchContext | null = null
): Promise<Prediction> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const matchCtxBlock = buildMatchContextBlock(matchContext);

  const prompt = `Predict the result of this FIFA World Cup 2026 match:

HOME TEAM: ${homeTeam}
AWAY TEAM: ${awayTeam}
${matchCtxBlock}
AVAILABLE DATA:
${contextData}

Use Google Search to find the latest news, injuries, and form for both teams.
Then calculate probabilities and provide your analysis.
Respond ONLY with the requested JSON.`;

  try {
    const result = await model.generateContent(prompt);

    const response = result.response.text();
    console.log('[gemini] Raw response length:', response.length);

    return parseGeminiJson(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Re-throw with more context
    if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
      throw new Error('GEMINI_API_KEY_INVALID: The API key is invalid or expired');
    }
    if (msg.includes('QUOTA') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('GEMINI_QUOTA_EXCEEDED: Rate limit or quota exceeded');
    }
    if (msg.includes('SAFETY') || msg.includes('blocked')) {
      throw new Error('GEMINI_SAFETY_BLOCKED: Prediction blocked by safety filters');
    }

    console.error('[gemini] generateContent failed:', msg);
    throw error;
  }
}
