import { describe, it, expect } from 'vitest';
import { parseGroqJson, validatePrediction } from '../groq';

describe('parseGroqJson', () => {
  it('should parse complete prediction JSON', () => {
    const response = JSON.stringify({
      homeWin: 60, draw: 25, awayWin: 15,
      predictedScoreHome: 2, predictedScoreAway: 1,
      confidence: 'alta',
      analysis: 'Brasil es favorito por su ataque.',
      keyFactors: [{ label: 'Forma', homeAdvantage: 5, description: 'Buena racha' }],
      homeKeyPlayers: ['Vinícius Jr.', 'Rodrygo'],
      awayKeyPlayers: ['Messi'],
      homeFormLast5: ['W', 'W', 'D', 'W', 'L'],
      awayFormLast5: ['W', 'D', 'W', 'W', 'W'],
      homeAttackStrength: 85, awayAttackStrength: 78,
      homeDefenseStrength: 72, awayDefenseStrength: 80,
      homeMidfieldStrength: 80, awayMidfieldStrength: 75,
    });
    const result = parseGroqJson(response);
    expect(result.homeWin).toBe(60);
    expect(result.predictedScoreHome).toBe(2);
    expect(result.confidence).toBe('alta');
    expect(result.homeKeyPlayers).toContain('Vinícius Jr.');
  });

  it('should strip markdown code fences', () => {
    const response = '```json\n{"homeWin":50,"draw":30,"awayWin":20,"predictedScoreHome":1,"predictedScoreAway":1,"confidence":"media","analysis":"Empate","keyFactors":[],"homeKeyPlayers":[],"awayKeyPlayers":[],"homeFormLast5":["D","D","D","D","D"],"awayFormLast5":["D","D","D","D","D"],"homeAttackStrength":50,"awayAttackStrength":50,"homeDefenseStrength":50,"awayDefenseStrength":50,"homeMidfieldStrength":50,"awayMidfieldStrength":50}\n```';
    const result = parseGroqJson(response);
    expect(result.homeWin).toBe(50);
  });

  it('should throw on completely invalid response', () => {
    expect(() => parseGroqJson('This is not JSON at all')).toThrow(
      'No se pudo analizar'
    );
  });

  it('should throw on malformed JSON without parseable object', () => {
    expect(() => parseGroqJson('{"homeWin": broken}')).toThrow(
      'No se pudo analizar'
    );
  });
});

describe('validatePrediction', () => {
  it('should return valid prediction with correct values', () => {
    const result = validatePrediction({
      homeWin: 60, draw: 25, awayWin: 15,
      predictedScoreHome: 2, predictedScoreAway: 1,
      confidence: 'alta', analysis: 'test',
      keyFactors: [], homeKeyPlayers: [], awayKeyPlayers: [],
      homeFormLast5: ['W', 'W', 'W', 'W', 'W'],
      awayFormLast5: ['L', 'L', 'L', 'L', 'L'],
      homeAttackStrength: 85, awayAttackStrength: 78,
      homeDefenseStrength: 72, awayDefenseStrength: 80,
      homeMidfieldStrength: 80, awayMidfieldStrength: 75,
    }, 'test');
    expect(result.homeWin).toBe(60);
    expect(result.confidence).toBe('alta');
  });

  it('should normalize confidence to valid values', () => {
    const result = validatePrediction({
      homeWin: 50, draw: 30, awayWin: 20,
      predictedScoreHome: 1, predictedScoreAway: 0,
      confidence: 'invalid', analysis: 'test',
      keyFactors: [], homeKeyPlayers: [], awayKeyPlayers: [],
      homeFormLast5: ['W', 'W', 'W', 'W', 'W'],
      awayFormLast5: ['L', 'L', 'L', 'L', 'L'],
      homeAttackStrength: 50, awayAttackStrength: 50,
      homeDefenseStrength: 50, awayDefenseStrength: 50,
      homeMidfieldStrength: 50, awayMidfieldStrength: 50,
    }, 'test');
    expect(result.confidence).toBe('media'); // fallback
  });

  it('should clamp values to valid ranges', () => {
    const result = validatePrediction({
      homeWin: 150, draw: -10, awayWin: 50,
      predictedScoreHome: 10, predictedScoreAway: -1,
      confidence: 'alta', analysis: 'test',
      keyFactors: [], homeKeyPlayers: [], awayKeyPlayers: [],
      homeFormLast5: ['W', 'W', 'W', 'W', 'W'],
      awayFormLast5: ['L', 'L', 'L', 'L', 'L'],
      homeAttackStrength: 85, awayAttackStrength: 78,
      homeDefenseStrength: 72, awayDefenseStrength: 80,
      homeMidfieldStrength: 80, awayMidfieldStrength: 75,
    }, 'test');
    expect(result.homeWin).toBeGreaterThanOrEqual(0);
    expect(result.predictedScoreHome).toBeLessThanOrEqual(6);
  });
});
