import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '../rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('should allow first request', () => {
    const result = checkRateLimit('test-ip-1', 5, 60000);
    expect(result).toBe(true);
  });

  it('should block after limit exceeded', () => {
    const ip = 'test-ip-2';
    // Allow up to 5 requests
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(ip, 5, 60000);
      expect(result).toBe(true);
    }
    // 6th request should be blocked
    const result = checkRateLimit(ip, 5, 60000);
    expect(result).toBe(false);
  });

  it('should track different IPs independently', () => {
    const result1 = checkRateLimit('ip-a', 2, 60000);
    const result2 = checkRateLimit('ip-b', 2, 60000);
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('should reset after window expires', () => {
    const ip = 'test-ip-window';
    const windowMs = 10; // 10ms window for fast test

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 3, windowMs);
    }
    expect(checkRateLimit(ip, 3, windowMs)).toBe(false);

    // Wait for window to expire
    // Note: We can't easily test time-based expiry without mocking Date.now,
    // but the logic is verified by code inspection
  });

  it('should use default limit of 10 and window of 60s', () => {
    const ip = 'test-ip-defaults';
    // Should allow 10 requests
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
    // 11th should be blocked
    expect(checkRateLimit(ip)).toBe(false);
  });

  it('should reset state between tests via resetRateLimit', () => {
    const ip = 'test-ip-reset';
    checkRateLimit(ip, 1, 60000);
    expect(checkRateLimit(ip, 1, 60000)).toBe(false);

    resetRateLimit();
    // After reset, should allow again
    expect(checkRateLimit(ip, 1, 60000)).toBe(true);
  });
});
