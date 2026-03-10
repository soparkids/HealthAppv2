import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Rate limiters for different endpoints
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
  analytics: true,
  prefix: "ratelimit:auth",
});

export const mutationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests per minute
  analytics: true,
  prefix: "ratelimit:mutation",
});

export const readRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
  prefix: "ratelimit:read",
});

// Helper to check rate limit
export async function checkRedisRateLimit(
  identifier: string,
  type: "auth" | "mutation" | "read" = "read"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = type === "auth" 
    ? authRateLimit 
    : type === "mutation" 
      ? mutationRateLimit 
      : readRateLimit;

  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset };
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
