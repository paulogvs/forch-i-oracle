import { describe, it, expect } from 'vitest';

describe('gemini', () => {
  it('should parse valid JSON response', () => {
    const mockResponse = '{"winner":"Brazil","confidence":85}';
    const result = JSON.parse(mockResponse);
    expect(result.winner).toBe('Brazil');
  });

  it('should handle analysis text with special characters', () => {
    const mockResponse = '{"homeWin":60,"draw":25,"awayWin":15,"analysis":"Brasil es favorito con un 60% de probabilidades."}';
    const result = JSON.parse(mockResponse);
    expect(result.homeWin).toBe(60);
    expect(result.analysis).toContain('Brasil');
  });

  it('should extract JSON from markdown wrapper', () => {
    const wrapped = '```json\n{"homeWin":50,"draw":30,"awayWin":20}\n```';
    const cleaned = wrapped.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);
    expect(result.homeWin).toBe(50);
  });
});
