import { describe, it, expect } from 'vitest';
import { parseGeminiJson, validatePrediction } from '../gemini';

describe('parseGeminiJson', () => {
  it('should parse plain JSON response', () => {
    const response = '{"homeWin":60,"draw":25,"awayWin":15,"analysis":"Brasil es favorito"}';
    const result = parseGeminiJson(response);
    expect(result.homeWin).toBe(60);
    expect(result.draw).toBe(25);
    expect(result.awayWin).toBe(15);
    expect(result.analysis).toBe('Brasil es favorito');
  });

  it('should strip markdown json code fences', () => {
    const response = '```json\n{"homeWin":50,"draw":30,"awayWin":20,"analysis":"Tight match"}\n```';
    const result = parseGeminiJson(response);
    expect(result.homeWin).toBe(50);
    expect(result.draw).toBe(30);
    expect(result.awayWin).toBe(20);
  });

  it('should strip markdown code fences without json tag', () => {
    const response = '```\n{"homeWin":70,"draw":20,"awayWin":10,"analysis":"Clear favorite"}\n```';
    const result = parseGeminiJson(response);
    expect(result.homeWin).toBe(70);
  });

  it('should extract JSON from response with surrounding text', () => {
    const response = 'Sure, here is the prediction:\n```json\n{"homeWin":45,"draw":30,"awayWin":25,"analysis":"Even match"}\n```\nHope this helps!';
    const result = parseGeminiJson(response);
    expect(result.homeWin).toBe(45);
    expect(result.analysis).toBe('Even match');
  });

  it('should handle analysis with special characters', () => {
    const response = '{"homeWin":55,"draw":25,"awayWin":20,"analysis":"Brasil (60%) > Argentina — key: Mbappé injured, Messi\'s form 🏆"}';
    const result = parseGeminiJson(response);
    expect(result.analysis).toContain('Mbappé');
    expect(result.analysis).toContain("Messi's");
    expect(result.analysis).toContain('🏆');
  });

  it('should throw on completely invalid response', () => {
    expect(() => parseGeminiJson('This is not JSON at all')).toThrow(
      'Could not parse response'
    );
  });

  it('should throw on malformed JSON without parseable object', () => {
    expect(() => parseGeminiJson('{"homeWin": broken}')).toThrow(
      'Could not parse response'
    );
  });
});

describe('validatePrediction', () => {
  it('should return valid prediction with correct values', () => {
    const result = validatePrediction({ homeWin: 60, draw: 25, awayWin: 15, analysis: 'test' }, 'test');
    expect(result.homeWin).toBe(60);
    expect(result.draw).toBe(25);
    expect(result.awayWin).toBe(15);
    expect(result.analysis).toBe('test');
  });

  it('should clamp values to 0-100 range', () => {
    const result = validatePrediction({ homeWin: 150, draw: -10, awayWin: 50, analysis: 'test' }, 'test');
    expect(result.homeWin).toBe(100);
    expect(result.draw).toBe(0);
    expect(result.awayWin).toBe(50);
  });

  it('should round decimal values', () => {
    const result = validatePrediction({ homeWin: 55.7, draw: 25.3, awayWin: 19.1, analysis: 'test' }, 'test');
    expect(result.homeWin).toBe(56);
    expect(result.draw).toBe(25);
    expect(result.awayWin).toBe(19);
  });

  it('should handle string-number inputs', () => {
    const result = validatePrediction({ homeWin: '60', draw: '25', awayWin: '15', analysis: 'test' }, 'test');
    expect(result.homeWin).toBe(60);
  });

  it('should default analysis to fallback when not a string', () => {
    const result = validatePrediction({ homeWin: 50, draw: 30, awayWin: 20, analysis: null }, 'test');
    expect(result.analysis).toBe('Analysis not available.');
  });

  it('should throw when values are NaN', () => {
    expect(() =>
      validatePrediction({ homeWin: 'abc', draw: 25, awayWin: 15, analysis: 'test' }, 'test')
    ).toThrow('Invalid prediction values');
  });
});
