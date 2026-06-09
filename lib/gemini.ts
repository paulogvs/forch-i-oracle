// FORCH.i ORACLE — Cliente Gemini 1.5 Flash con Grounding
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicialización lazy — no crashea en build time sin .env.local
function getGenAI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en .env.local');
  }
  return new GoogleGenerativeAI(API_KEY);
}

// Prompt del sistema para análisis deportivo
const SYSTEM_PROMPT = `Eres un analista deportivo de élite mundial, especializado en fútbol internacional.
Tu nombre es FORCH.i Oracle.

Antes de calcular predicciones, SIEMPRE usa tu herramienta de búsqueda para encontrar:
1. LESIONES ACTUALES de jugadores clave de ambos equipos
2. TARJETAS Y AMONESTACIONES recientes que puedan afectar alineaciones
3. ALINEACIONES PROBABLES del último partido de cada equipo
4. FORMA RECIENTE — resultados de los últimos 5 partidos oficiales
5. HISTORIAL DE ENFRENTAMIENTOS directos entre ambos equipos
6. NOTICIAS RELEVANTES — cambios de entrenador, conflictos internos, motivación

Luego calcula los porcentajes de probabilidad:
- homeWin: probabilidad de victoria del equipo local (0-100)
- draw: probabilidad de empate (0-100)
- awayWin: probabilidad de victoria del equipo visitante (0-100)

Y escribe un ANÁLISIS TÁCTICO de 3-5 oraciones cubriendo:
- Formación esperada y estilo de juego
- Jugadores clave a vigilar
- Fortalezas y debilidades de cada equipo
- Factor local y moral del equipo
- Predicción cualitativa del partido

Responde ÚNICAMENTE con este JSON (sin markdown, sin código, sin explicaciones extra):
{"homeWin": number, "draw": number, "awayWin": number, "analysis": "string"}`;

export interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  analysis: string;
}

/**
 * Genera una predicción usando Gemini 1.5 Flash con Grounding
 */
export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  contextData: string
): Promise<Prediction> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = `Predice el resultado de este partido del Mundial FIFA 2026:

🏠 EQUIPO LOCAL: ${homeTeam}
✈️ EQUIPO VISITANTE: ${awayTeam}

📊 DATOS DISPONIBLES:
${contextData}

Busca noticias recientes sobre ambos equipos y calcula las probabilidades.
Responde SOLO con el JSON solicitado.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parsear la respuesta JSON
  try {
    // Limpiar la respuesta de posibles markdown wrappers
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validar que los porcentajes sumen ~100
    const total = (parsed.homeWin || 0) + (parsed.draw || 0) + (parsed.awayWin || 0);

    return {
      homeWin: Math.round(parsed.homeWin || 0),
      draw: Math.round(parsed.draw || 0),
      awayWin: Math.round(parsed.awayWin || 0),
      analysis: parsed.analysis || 'Análisis no disponible.',
    };
  } catch {
    // Si el parse falla, intentar extraer JSON del texto
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        homeWin: Math.round(parsed.homeWin || 0),
        draw: Math.round(parsed.draw || 0),
        awayWin: Math.round(parsed.awayWin || 0),
        analysis: parsed.analysis || 'Análisis no disponible.',
      };
    }
    throw new Error('No se pudo parsear la respuesta de Gemini');
  }
}
