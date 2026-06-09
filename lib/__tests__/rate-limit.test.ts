import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../rate-limit';

describe('rate-limit', () => {
  it('should allow first request', () => {
    const result = checkRateLimit('test-ip-1', 5, 60000);
    expect(result).toBe(true);
  });

  it('should block after limit exceeded', () => {
    const ip = 'test-ip-2';
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, 5, 60000);
    }
    const result = checkRateLimit(ip, 5, 60000);
    expect(result).toBe(false);
  });

  it('should track different IPs independently', () => {
    const result1 = checkRateLimit('ip-a', 2, 60000);
    const result2 = checkRateLimit('ip-b', 2, 60000);
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});
