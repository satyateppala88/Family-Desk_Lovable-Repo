/**
 * Simple in-memory rate limiter for edge functions.
 * Per-user, per-function rate limiting with sliding window.
 * 
 * Note: Since edge functions are stateless across invocations in production,
 * this provides per-instance protection. For distributed rate limiting,
 * use a database-backed approach.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > windowMs * 2) {
      rateLimitMap.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume rate limit for a user + function combination.
 */
export function checkRateLimit(
  userId: string,
  functionName: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup(config.windowMs);

  const key = `${functionName}:${userId}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

/** Pre-configured rate limits for common use cases */
export const AI_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 10 requests per minute
};

export const AI_HEAVY_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60_000, // 5 requests per minute (for expensive operations like meal generation)
};

export const STANDARD_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000, // 30 requests per minute
};
