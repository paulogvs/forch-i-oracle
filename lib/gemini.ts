// FORCH.i ORACLE — Groq + Llama 3.3 client
import Groq from 'groq-sdk';

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

Tu tarea es analizar partidos del Mundial FIFA 2026 con la máxima precisión posible.

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
- homeWin/draw/awayWin: Probabilidades 0-100 (deben sumar 100)
- predictedScoreHome/away: Marcador predicho (0-6)
- confidence: "alta", "media", o "baja"
- analysis: Análisis táctico en español (3-5 oraciones)
- keyFactors: 4 factores clave. homeAdvantage va de -10 (muy a favor visitante) a +10 (muy a favor local)
- homeKeyPlayers/awayKeyPlayers: 2 jugadores clave de cada equipo
- homeFormLast5/awayFormLast5: Últimos 5 partidos como array de "W", "D", "L"
- Attack/Defense/MidfieldStrength: Rating 0-100 para cada área`;

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

export function parseGeminiJson(response: string): Prediction {
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

  // Normalize to sum to 100
  const total = homeWin + draw + awayWin;
  const normalizedWin = total > 0 ? Math.round((homeWin / total) * 100) : 40;
  const normalizedDraw = total > 0 ? Math.round((draw / total) * 100) : 30;
  const normalizedAway = 100 - normalizedWin - normalizedDraw;

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

export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  contextData: string,
  matchContext: MatchContext | null = null
): Promise<Prediction> {
  const groq = getGroqClient();

  const matchCtxBlock = buildMatchContextBlock(matchContext);

  const prompt = `Analiza el siguiente partido del Mundial FIFA 2026:

EQUIPO LOCAL: ${homeTeam}
EQUIPO VISITANTE: ${awayTeam}
${matchCtxBlock}
DATOS DISPONIBLES:
${contextData}

Usa búsqueda web para encontrar las últimas noticias, lesiones y forma de ambos equipos.
Calcula probabilidades y proporciona tu análisis completo.
Responde ÚNICAMENTE con el JSON solicitado en español.`;

  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const response = result.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Respuesta vacía del modelo');
    }

    console.log('[groq] Raw response length:', response.length);

    return parseGeminiJson(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

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
