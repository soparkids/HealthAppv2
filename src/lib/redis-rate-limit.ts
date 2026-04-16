import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function looksLikePlaceholderUrl(url: string): boolean {
  return /your-endpoint|example\.com/i.test(url);
}

function looksLikePlaceholderToken(token: string): boolean {
  return token === "your-token-here";
}

/** True when Upstash env vars look like real credentials (not empty / template values). */
export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (!url || !token) return false;
  if (looksLikePlaceholderUrl(url) || looksLikePlaceholderToken(token)) return false;
  return true;
}

let redis: Redis | null = null;
let authRateLimit: Ratelimit | null = null;
let mutationRateLimit: Ratelimit | null = null;
let readRateLimit: Ratelimit | null = null;

function getLimiters() {
  if (!isRedisConfigured()) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    authRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    });
    mutationRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:mutation",
    });
    readRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "ratelimit:read",
    });
  }
  return { authRateLimit, mutationRateLimit, readRateLimit };
}

export async function checkRedisRateLimit(
  identifier: string,
  type: "auth" | "mutation" | "read" = "read"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiters = getLimiters();
  if (!limiters) {
    throw new Error("checkRedisRateLimit called without Redis configured");
  }
  const limiter =
    type === "auth"
      ? limiters.authRateLimit!
      : type === "mutation"
        ? limiters.mutationRateLimit!
        : limiters.readRateLimit!;

  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset };
}
