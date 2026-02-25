import { NextResponse } from "next/server";
import { checkRateLimit, API_RATE_LIMIT } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

/**
 * Rate limit configuration per route category.
 * More restrictive for auth, moderate for mutations, permissive for reads.
 */
const ROUTE_LIMITS: Record<string, { maxAttempts: number; windowMs: number }> = {
  auth: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },       // 5 per 15 min
  mutation: { maxAttempts: 30, windowMs: 60 * 1000 },        // 30 per minute
  read: { maxAttempts: 100, windowMs: 60 * 1000 },           // 100 per minute
};

function getRouteCategory(pathname: string, method: string): string {
  if (pathname.includes("/api/auth")) return "auth";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) return "mutation";
  return "read";
}

/**
 * Apply rate limiting to an API request.
 * Returns null if allowed, or a NextResponse 429 if rate limited.
 */
export function applyRateLimit(request: Request): NextResponse | null {
  const url = new URL(request.url);
  const ip = getClientIp(request);
  const category = getRouteCategory(url.pathname, request.method);
  const config = ROUTE_LIMITS[category] || API_RATE_LIMIT;

  const key = `api:${category}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(config.maxAttempts),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.retryAfterMs / 1000)),
        },
      }
    );
  }

  return null;
}
