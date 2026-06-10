// FORCH.i ORACLE — Groq + Llama 3.3 client
import Groq from 'groq-sdk';
import type { StatisticalPrediction } from './predictor-engine';

// Lazy init — no crash at build time without .env.local
function getGroqClient(): Groq {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    throw new Error('GROQ_API_KEY not configured in environment variables');
  }
  return new Groq({ apiKey: API_KEY });
}

// System prompt for deep sports analysis
const SYSTEM_PROMPT = `Eres FORCH.i Oracle, un analista deportivo de élite especializado en fútbol internacional.

Tu metodología de análisis:
1. Evalúa la FORMA RECIENTE de ambos equipos (últimos 5 partidos)
2. Considera las LESIONES y ausencias clave (especialmente goleadores y porteros)
3. Analiza el HISTORIAL DIRECTO (H2H) entre ambos equipos
4. Factoriza la VENTAJA DE LOCAL (el equipo local suele tener +5-10% de probabilidad)
5. Considera el CONTEXTO del torneo (fase de grupos vs eliminatoria, necesidad de puntos)
6. Evalúa la CALIDAD DEL PLANTEL (jugadores estrella, profundidad de banquillo)
7. Analiza aspectos TÁCTICOS (estilo de juego, fortalezas y debilidades)

IMPORTANTE: Debes responder ÚNICAMENTE con este formato JSON (sin markdown, sin code fences, sin texto extra):
{
  "homeWin": 55,
  "draw": 25,
  "awayWin": 20,
  "predictedScoreHome": 2,
  "predictedScoreAway": 1,
  "confidence": "alta",
  "analysis": "Texto de análisis táctico de 3-5 oraciones.",
  "keyFactors": [
    {"label": "Forma reciente", "homeAdvantage": 8, "description": "Descripción breve"},
    {"label": "Plantel y estrellas", "homeAdvantage": 3, "description": "Descripción breve"},
    {"label": "Historial directo", "homeAdvantage": -2, "description": "Descripción breve"},
    {"label": "Ventaja de local", "homeAdvantage": 5, "description": "Descripción breve"}
  ],
  "homeKeyPlayers": ["Jugador 1", "Jugador 2"],
  "awayKeyPlayers": ["Jugador 1", "Jugador 2"],
  "homeFormLast5": ["W", "W", "D", "L", "W"],
  "awayFormLast5": ["L", "W", "W", "D", "W"],
  "homeAttackStrength": 85,
  "awayAttackStrength": 78,
  "homeDefenseStrength": 72,
  "awayDefenseStrength": 80,
  "homeMidfieldStrength": 80,
  "awayMidfieldStrength": 75
}

CAMPOS:
- homeWin/draw/awayWin: Probabilidades 0-100 (deben sumar exactamente 100)
- predictedScoreHome/away: Marcador predicho (0-6) — sé realista, la mayoría de partidos terminan 0-0 a 3-2
- confidence: "alta" (diferencia clara de nivel), "media" (partido parejo), o "baja" (muy impredecible)
- analysis: Análisis táctico en español (3-5 oraciones) — menciona forma, lesiones, estilo de juego, y predicción
- keyFactors: 4 factores clave. homeAdvantage va de -10 (muy a favor visitante) a +10 (muy a favor local)
- homeKeyPlayers/awayKeyPlayers: 2 jugadores clave de cada equipo (usa nombres reales de jugadores actuales)
- homeFormLast5/awayFormLast5: Últimos 5 partidos como array de "W" (victoria), "D" (empate), "L" (derrota)
- Attack/Defense/MidfieldStrength: Rating 0-100 para cada área del equipo — sé específico, no pongas todo en 50

GUÍAS DE RATING:
- Equipos de élite (Francia, Brasil, Argentina, España): Attack 85-95, Defense 80-90, Midfield 80-92
- Equipos fuertes (Alemania, Portugal, Países Bajos, Inglaterra): Attack 78-88, Defense 75-85, Midfield 75-85
- Equipos competitivos (México, EE.UU., Japón, Marruecos): Attack 65-78, Defense 62-75, Midfield 65-75
- Equipos modestos: Attack 45-65, Defense 45-62, Midfield 45-62`;

// Lightweight system prompt for text-only analysis (numbers are pre-calculated)
const SYSTEM_PROMPT_TEXT_ONLY = `Eres FORCH.i Oracle, un analista deportivo de élite.
Tu trabajo es escribir análisis tácticos convincentes en español para partidos de fútbol.
Sé específico: menciona jugadores reales, tácticas, forma reciente, y contexto.
No inventes probabilidades ni estadísticas — usa los datos que se te proporcionan.`;

export interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScoreHome: number;
  predictedScoreAway: number;
  confidence: 'alta' | 'media' | 'baja';
  analysis: string;
  keyFactors: { label: string; homeAdvantage: number; description: string }[];
  homeKeyPlayers: string[];
  awayKeyPlayers: string[];
  homeFormLast5: ('W' | 'D' | 'L')[];
  awayFormLast5: ('W' | 'D' | 'L')[];
  homeAttackStrength: number;
  awayAttackStrength: number;
  homeDefenseStrength: number;
  awayDefenseStrength: number;
  homeMidfieldStrength: number;
  awayMidfieldStrength: number;
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

function buildMatchContextBlock(ctx: MatchContext | null): string {
  if (!ctx) return '';

  const dateFormatted = new Date(`${ctx.date}T${ctx.time}:00Z`).toLocaleDateString(
    'es-BO',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return `
CONTEXTO DEL PARTIDO (Fase de Grupos - Mundial FIFA 2026):
- Grupo: ${ctx.group}
- Jornada: ${ctx.matchday} de 3
- Fecha: ${dateFormatted} a las ${ctx.time} UTC
- Estadio: ${ctx.venue}, ${ctx.city}
- Es un partido de FASE DE GRUPOS — cada punto cuenta para la clasificación.
`;
}

export function parseGroqJson(response: string): Prediction {
  const cleaned = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return validatePrediction(parsed, 'direct parse');
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validatePrediction(parsed, 'regex extraction');
      } catch {
        const aggressiveMatch = response.match(/\{[\s\S]*?\}/);
        if (aggressiveMatch) {
          try {
            const parsed = JSON.parse(aggressiveMatch[0]);
            return validatePrediction(parsed, 'aggressive extraction');
          } catch {
            // Fall through
          }
        }
      }
    }
    throw new Error(`No se pudo analizar la respuesta: ${response.substring(0, 200)}`);
  }
}

function normalizeForm(form: unknown): ('W' | 'D' | 'L')[] {
  if (!Array.isArray(form) || form.length === 0) return ['D', 'D', 'D', 'D', 'D'];
  return form.map((f) => {
    const s = String(f).toUpperCase();
    if (s === 'W') return 'W';
    if (s === 'D') return 'D';
    if (s === 'L') return 'L';
    return 'D';
  }).slice(0, 5);
}

function clampRange(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function validatePrediction(parsed: Record<string, unknown>, source: string): Prediction {
  const homeWin = clampRange(parsed.homeWin, 0, 100, 40);
  const draw = clampRange(parsed.draw, 0, 100, 30);
  const awayWin = clampRange(parsed.awayWin, 0, 100, 30);

  // Normalize to sum to 100 — handle rounding carefully
  const total = homeWin + draw + awayWin;
  let normalizedWin: number, normalizedDraw: number, normalizedAway: number;

  if (total === 0) {
    // All-zero fallback
    normalizedWin = 40;
    normalizedDraw = 30;
    normalizedAway = 30;
  } else {
    // Use precise rounding: compute all three, then fix rounding drift on the smallest
    const rawWin = (homeWin / total) * 100;
    const rawDraw = (draw / total) * 100;
    const rawAway = (awayWin / total) * 100;

    normalizedWin = Math.round(rawWin);
    normalizedDraw = Math.round(rawDraw);
    normalizedAway = Math.round(rawAway);

    // Fix rounding drift: adjust the largest value to ensure sum = 100
    const drift = 100 - (normalizedWin + normalizedDraw + normalizedAway);
    if (drift !== 0) {
      // Add/subtract drift from the largest component
      if (normalizedWin >= normalizedDraw && normalizedWin >= normalizedAway) {
        normalizedWin += drift;
      } else if (normalizedDraw >= normalizedAway) {
        normalizedDraw += drift;
      } else {
        normalizedAway += drift;
      }
    }

    // Safety clamp: ensure no negative values
    normalizedWin = Math.max(0, normalizedWin);
    normalizedDraw = Math.max(0, normalizedDraw);
    normalizedAway = Math.max(0, normalizedAway);

    // Final sanity check
    if (normalizedWin + normalizedDraw + normalizedAway !== 100) {
      normalizedWin = Math.max(0, normalizedWin);
      normalizedDraw = Math.max(0, normalizedDraw);
      normalizedAway = 100 - normalizedWin - normalizedDraw;
      normalizedAway = Math.max(0, normalizedAway);
    }
  }

  const confidence = typeof parsed.confidence === 'string' && ['alta', 'media', 'baja'].includes(parsed.confidence)
    ? parsed.confidence as 'alta' | 'media' | 'baja'
    : 'media';

  const rawKeyFactors = parsed.keyFactors;
  const keyFactors = Array.isArray(rawKeyFactors) ? rawKeyFactors.slice(0, 4).map((f: unknown) => {
    const factor = f as Record<string, unknown>;
    return {
      label: String(factor.label || 'Factor'),
      homeAdvantage: clampRange(factor.homeAdvantage, -10, 10, 0),
      description: String(factor.description || ''),
    };
  }) : [
    { label: 'Forma reciente', homeAdvantage: 0, description: 'Análisis basado en forma reciente' },
    { label: 'Plantel', homeAdvantage: 0, description: 'Calidad del plantel' },
    { label: 'Historial directo', homeAdvantage: 0, description: 'Resultados previos' },
    { label: 'Ventaja local', homeAdvantage: 5, description: 'Factor local' },
  ];

  return {
    homeWin: normalizedWin,
    draw: normalizedDraw,
    awayWin: normalizedAway,
    predictedScoreHome: clampRange(parsed.predictedScoreHome, 0, 6, 1),
    predictedScoreAway: clampRange(parsed.predictedScoreAway, 0, 6, 1),
    confidence,
    analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Análisis no disponible.',
    keyFactors,
    homeKeyPlayers: Array.isArray(parsed.homeKeyPlayers) ? parsed.homeKeyPlayers.map(String).slice(0, 2) : [],
    awayKeyPlayers: Array.isArray(parsed.awayKeyPlayers) ? parsed.awayKeyPlayers.map(String).slice(0, 2) : [],
    homeFormLast5: normalizeForm(parsed.homeFormLast5),
    awayFormLast5: normalizeForm(parsed.awayFormLast5),
    homeAttackStrength: clampRange(parsed.homeAttackStrength, 0, 100, 50),
    awayAttackStrength: clampRange(parsed.awayAttackStrength, 0, 100, 50),
    homeDefenseStrength: clampRange(parsed.homeDefenseStrength, 0, 100, 50),
    awayDefenseStrength: clampRange(parsed.awayDefenseStrength, 0, 100, 50),
    homeMidfieldStrength: clampRange(parsed.homeMidfieldStrength, 0, 100, 50),
    awayMidfieldStrength: clampRange(parsed.awayMidfieldStrength, 0, 100, 50),
  };
}

/**
 * Parse a SIMPLIFIED Groq response that only contains analysis + keyPlayers.
 * Used when the predictor-engine has already calculated all the numbers.
 */
export function parseGroqAnalysis(response: string): {
  analysis: string;
  homeKeyPlayers: string[];
  awayKeyPlayers: string[];
} {
  const cleaned = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Análisis no disponible.',
      homeKeyPlayers: Array.isArray(parsed.homeKeyPlayers) ? parsed.homeKeyPlayers.map(String).slice(0, 2) : [],
      awayKeyPlayers: Array.isArray(parsed.awayKeyPlayers) ? parsed.awayKeyPlayers.map(String).slice(0, 2) : [],
    };
  } catch {
    // Try to extract JSON from larger response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Análisis no disponible.',
          homeKeyPlayers: Array.isArray(parsed.homeKeyPlayers) ? parsed.homeKeyPlayers.map(String).slice(0, 2) : [],
          awayKeyPlayers: Array.isArray(parsed.awayKeyPlayers) ? parsed.awayKeyPlayers.map(String).slice(0, 2) : [],
        };
      } catch {
        // Fallthrough
      }
    }
    // Fallback: use the whole response as analysis
    return {
      analysis: response.substring(0, 500) || 'Análisis no disponible.',
      homeKeyPlayers: [],
      awayKeyPlayers: [],
    };
  }
}

export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  contextData: string,
  matchContext: MatchContext | null = null,
  stats?: StatisticalPrediction  // Stats calculated by predictor-engine
): Promise<Prediction> {
  const groq = getGroqClient();

  const matchCtxBlock = buildMatchContextBlock(matchContext);

  // Stats block — pre-calculated numbers for Groq to reference in analysis
  const statsBlock = stats ? `
PROBABILIDADES CALCULADAS (modelo de Poisson + Elo):
- Victoria ${homeTeam}: ${stats.homeWin}%
- Empate: ${stats.draw}%
- Victoria ${awayTeam}: ${stats.awayWin}%
- Marcador más probable: ${stats.predictedScoreHome}-${stats.predictedScoreAway}
- Goles esperados ${homeTeam}: ${stats.homeExpectedGoals} xG
- Goles esperados ${awayTeam}: ${stats.awayExpectedGoals} xG
- Rating ataque: ${homeTeam} ${stats.homeAttack}/100 vs ${awayTeam} ${stats.awayAttack}/100
- Rating defensa: ${homeTeam} ${stats.homeDefense}/100 vs ${awayTeam} ${stats.awayDefense}/100
- Rating mediocampo: ${homeTeam} ${stats.homeMidfield}/100 vs ${awayTeam} ${stats.awayMidfield}/100
- Elo rating: ${homeTeam} ${stats.homeElo} vs ${awayTeam} ${stats.awayElo}
- Confianza del modelo: ${stats.confidence}
` : '';

  // NEW PROMPT: Groq ONLY writes the analysis text, numbers are pre-calculated
  const prompt = `Eres FORCH.i Oracle y debes escribir el ANÁLISIS NARRATIVO de este partido.

Las probabilidades y ratings YA ESTÁN CALCULADOS por un modelo estadístico (Poisson + Elo).
Tu trabajo es explicar el POR QUÉ de estos números en un análisis táctico convincente.

EQUIPO LOCAL: ${homeTeam}
EQUIPO VISITANTE: ${awayTeam}
${matchCtxBlock}
${statsBlock}
DATOS EN TIEMPO REAL:
${contextData}

INSTRUCCIONES:
- Escribe un análisis táctico de 3-5 oraciones en español.
- Menciona la forma reciente, jugadores clave, estilo de juego, y factores tácticos.
- Explica por qué ${homeTeam} tiene ${stats?.homeWin || 'X'}% de probabilidad de victoria.
- NO inventes probabilidades ni ratings — ya están calculados arriba.
- Sé específico: menciona nombres de jugadores reales, tácticas, y contexto del partido.

IMPORTANTE: Responde ÚNICAMENTE con este formato JSON:
{
  "analysis": "Tu análisis táctico aquí (3-5 oraciones en español).",
  "homeKeyPlayers": ["Jugador 1", "Jugador 2"],
  "awayKeyPlayers": ["Jugador 1", "Jugador 2"]
}`;

  try {
    // Timeout de 8s para Groq (Vercel free tier = 10s total)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GROQ_TIMEOUT: Groq tardó más de 8s')), 8000)
    );

    const result = await Promise.race([
      groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_TEXT_ONLY },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,       // Más bajo = más rápido y determinista
        max_tokens: 512,        // Solo necesita analysis + 4 players
      }),
      timeoutPromise,
    ]);

    const response = result.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Respuesta vacía del modelo');
    }

    console.log('[groq] Raw response length:', response.length);

    const analysis = parseGroqAnalysis(response);

    // Build a full Prediction object with defaults (numbers come from stats, not Groq)
    return {
      homeWin: 40,       // Overridden by caller with stats
      draw: 30,           // Overridden by caller with stats
      awayWin: 30,        // Overridden by caller with stats
      predictedScoreHome: 1,  // Overridden by caller with stats
      predictedScoreAway: 1,  // Overridden by caller with stats
      confidence: 'media',    // Overridden by caller with stats
      analysis: analysis.analysis,
      keyFactors: [],         // Overridden by caller with stats
      homeKeyPlayers: analysis.homeKeyPlayers,
      awayKeyPlayers: analysis.awayKeyPlayers,
      homeFormLast5: ['D', 'D', 'D', 'D', 'D'],
      awayFormLast5: ['D', 'D', 'D', 'D', 'D'],
      homeAttackStrength: 50,
      awayAttackStrength: 50,
      homeDefenseStrength: 50,
      awayDefenseStrength: 50,
      homeMidfieldStrength: 50,
      awayMidfieldStrength: 50,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes('GROQ_TIMEOUT')) {
      throw new Error('GROQ_TIMEOUT: Groq tardó más de 8s — usando predicción sin análisis');
    }
    if (msg.includes('API_KEY') || msg.includes('authentication') || msg.includes('401')) {
      throw new Error('GROQ_API_KEY_INVALID: La clave API es inválida o expiró');
    }
    if (msg.includes('rate') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('GROQ_QUOTA_EXCEEDED: Límite de tasa o cuota excedido');
    }
    if (msg.includes('No se pudo analizar')) {
      throw new Error(`LLM_PARSE_ERROR: ${msg}`);
    }

    console.error('[groq] LLM call failed:', msg);
    throw error;
  }
}
