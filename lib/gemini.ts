// FORCH.i ORACLE — Gemini 1.5 Flash client with Grounding
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

Before calculating predictions, ALWAYS use your search tool to find:
1. CURRENT INJURIES of key players on both teams
2. RECENT CARDS AND BOOKINGS that may affect lineups
3. LIKELY LINEUPS from each team's last match
4. RECENT FORM — results from the last 5 official matches
5. HEAD-TO-HEAD history between both teams
6. RELEVANT NEWS — coaching changes, internal conflicts, motivation

Then calculate probability percentages:
- homeWin: home team win probability (0-100)
- draw: draw probability (0-100)
- awayWin: away team win probability (0-100)

And write a TACTICAL ANALYSIS of 3-5 sentences covering:
- Expected formation and playing style
- Key players to watch
- Strengths and weaknesses of each team
- Home advantage and team morale
- Qualitative match prediction

Respond ONLY with this JSON (no markdown, no code, no extra explanations):
{"homeWin": number, "draw": number, "awayWin": number, "analysis": "string"}`;

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
 * Generate a prediction using Gemini 1.5 Flash with Grounding
 */
export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  contextData: string,
  matchContext: MatchContext | null = null
): Promise<Prediction> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const matchCtxBlock = buildMatchContextBlock(matchContext);

  const prompt = `Predict the result of this FIFA World Cup 2026 match:

HOME TEAM: ${homeTeam}
AWAY TEAM: ${awayTeam}
${matchCtxBlock}
AVAILABLE DATA:
${contextData}

Search for recent news about both teams and calculate probabilities.
Respond ONLY with the requested JSON.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse the JSON response
  try {
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      homeWin: Math.round(parsed.homeWin || 0),
      draw: Math.round(parsed.draw || 0),
      awayWin: Math.round(parsed.awayWin || 0),
      analysis: parsed.analysis || 'Analysis not available.',
    };
  } catch {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        homeWin: Math.round(parsed.homeWin || 0),
        draw: Math.round(parsed.draw || 0),
        awayWin: Math.round(parsed.awayWin || 0),
        analysis: parsed.analysis || 'Analysis not available.',
      };
    }
    throw new Error('Could not parse Gemini response');
  }
}
