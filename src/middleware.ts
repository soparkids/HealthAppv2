import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Provider-only routes
    if (pathname.startsWith("/provider") && token?.role !== "PROVIDER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
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
    "/provider/:path*",
    "/admin/:path*",
    "/api/((?!auth|shared).*)/:path*",
  ],
};
