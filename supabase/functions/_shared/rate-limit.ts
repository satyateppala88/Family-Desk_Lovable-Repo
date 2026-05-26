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

/**
 * Database-backed rate limit check. Survives edge function cold starts by
 * persisting the counter in Postgres. Requires a service-role supabase client
 * and the `public.increment_rate_limit` RPC.
 *
 * Fails OPEN on database errors so a transient DB issue cannot lock users out.
 */
export async function checkRateLimitDb(
  supabaseAdmin: any,
  userId: string,
  functionName: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000
  ).toISOString();

  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_function_name: functionName,
    p_window_start: windowStart,
    p_max_requests: maxRequests,
  });

  if (error || !data) {
    return { allowed: true, remaining: maxRequests }; // fail open
  }
  return { allowed: !!data.allowed, remaining: Number(data.remaining ?? 0) };
}
