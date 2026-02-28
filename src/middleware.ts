import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight in-middleware rate limiter (Edge runtime compatible)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },     // 5 per 15 min
  mutation: { max: 30, windowMs: 60 * 1000 },       // 30 per minute
  read: { max: 100, windowMs: 60 * 1000 },          // 100 per minute
};

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

function checkApiRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const ip = getClientIp(req);

  // Determine rate limit category
  let category: keyof typeof RATE_LIMITS = "read";
  if (pathname.includes("/api/auth")) category = "auth";
  else if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) category = "mutation";

  const config = RATE_LIMITS[category];
  const key = `${category}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (entry.count >= config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  entry.count++;
  return null;
}

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) rateLimitStore.delete(key);
    }
  }, 60 * 1000);
}

// Routes only accessible to provider roles (not patients)
const PROVIDER_ONLY_ROUTES = [
  "/patients",
  "/appointments",
  "/lab-results",
  "/eye-consultations",
  "/equipment",
  "/medical-history",
  "/onboarding",
  "/provider",
];

const PROVIDER_ROLES = new Set(["PROVIDER", "ADMIN", "OWNER", "DOCTOR", "NURSE", "RECEPTIONIST"]);

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Apply rate limiting to API routes
    if (pathname.startsWith("/api/")) {
      const rateLimitResponse = checkApiRateLimit(req);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // Block PATIENT role from provider-only pages
    const isProviderRoute = PROVIDER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
    if (isProviderRoute && token?.role && !PROVIDER_ROLES.has(token.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Organization creation — only PROVIDER and ADMIN can access
    if (pathname.includes("/settings/create-org") && token?.role !== "PROVIDER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Inject active organization into request headers for API routes
    const response = NextResponse.next();
    if (token?.activeOrganizationId) {
      response.headers.set("x-organization-id", token.activeOrganizationId);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/records/:path*",
    "/care/:path*",
    "/family/:path*",
    "/patients/:path*",
    "/appointments/:path*",
    "/lab-results/:path*",
    "/eye-consultations/:path*",
    "/equipment/:path*",
    "/medical-history/:path*",
    "/my-results/:path*",
    "/onboarding/:path*",
    "/provider/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/((?!auth|shared).*)/:path*",
  ],
};
