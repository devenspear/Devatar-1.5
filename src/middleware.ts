/**
 * Middleware for Devatar
 *
 * - Security headers
 * - Route protection (all routes require login except /login)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers to apply to all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Strict CSP for production
const cspHeader =
  process.env.NODE_ENV === "production"
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: http:;";

const SESSION_COOKIE = "devatar_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply security headers to all responses
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  response.headers.set("Content-Security-Policy", cspHeader);

  // Add HSTS for production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/admin/auth"];

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // API routes are handled separately (they check auth internally if needed)
  const isApiRoute = pathname.startsWith("/api/");

  // Static assets and Next.js internals
  const isStaticAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg");

  // Skip auth check for public routes, API routes, and static assets
  if (isPublicRoute || isApiRoute || isStaticAsset) {
    return response;
  }

  // Protected routes - check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (!sessionCookie) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists - allow request
  // Note: Full JWT validation happens in the auth library
  // Middleware just does a quick cookie check for performance
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
