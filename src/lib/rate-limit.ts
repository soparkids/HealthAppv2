import { checkRedisRateLimit, isRedisConfigured } from "./redis-rate-limit";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Fallback in-memory store (used when Redis not configured)
const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (only for in-memory fallback)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export const API_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
};

// In-memory fallback check
function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
  }

  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    retryAfterMs: 0,
  };
}

// Main rate limit function - uses Redis if configured, falls back to memory
export async function checkRateLimitAsync(
  key: string,
  type: "auth" | "mutation" | "read" = "read"
): Promise<RateLimitResult> {
  if (isRedisConfigured()) {
    const result = await checkRedisRateLimit(key, type);
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterMs: result.success ? 0 : (result.reset - Date.now()),
    };
  }

  // Fallback to in-memory
  const config = type === "auth" ? AUTH_RATE_LIMIT : API_RATE_LIMIT;
  return checkMemoryRateLimit(key, config);
}

// Synchronous version for backward compatibility (uses memory only)
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkMemoryRateLimit(key, config);
}

export function clearRateLimit(key: string): void {
  memoryStore.delete(key);
}
