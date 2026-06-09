// FORCH.i ORACLE — Rate Limiting (in-memory, per-IP)

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimit = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  ip: string,
  limit = 10,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}
