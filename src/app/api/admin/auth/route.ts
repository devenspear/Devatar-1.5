/**
 * Admin Authentication API
 *
 * POST /api/admin/auth - Login with username + password
 * DELETE /api/admin/auth - Logout
 * GET /api/admin/auth - Check session status
 *
 * Security features:
 * - Username + password required
 * - Basic rate limiting (in-memory)
 * - Timing-safe comparison
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  validateSession,
  verifyCredentials,
  setSessionCookie,
  destroySession,
  getSession,
} from "@/lib/auth";

// In-memory rate limiting (simple but effective for serverless)
// For production at scale, consider Upstash Redis
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  lockoutMinutes?: number;
} {
  const record = failedAttempts.get(ip);

  if (!record) {
    return { allowed: true, remaining: LOCKOUT_THRESHOLD };
  }

  // Check if lockout has expired
  const timeSinceLastAttempt = Date.now() - record.lastAttempt;
  if (timeSinceLastAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(ip);
    return { allowed: true, remaining: LOCKOUT_THRESHOLD };
  }

  // Check if locked out
  if (record.count >= LOCKOUT_THRESHOLD) {
    const remainingMs = LOCKOUT_DURATION_MS - timeSinceLastAttempt;
    const lockoutMinutes = Math.ceil(remainingMs / 60000);
    return { allowed: false, remaining: 0, lockoutMinutes };
  }

  return { allowed: true, remaining: LOCKOUT_THRESHOLD - record.count };
}

function recordFailedAttempt(ip: string): number {
  const record = failedAttempts.get(ip);
  const newCount = (record?.count || 0) + 1;

  failedAttempts.set(ip, {
    count: newCount,
    lastAttempt: Date.now(),
  });

  return LOCKOUT_THRESHOLD - newCount;
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many failed attempts",
          locked: true,
          lockoutMinutes: rateCheck.lockoutMinutes,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials
    const isValid = await verifyCredentials(username, password);

    if (!isValid) {
      const remainingAttempts = recordFailedAttempt(ip);

      if (remainingAttempts <= 0) {
        return NextResponse.json(
          {
            error: "Account locked due to too many failed attempts",
            locked: true,
            lockoutMinutes: 30,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Invalid username or password",
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(ip);

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const token = await createSession(ip, userAgent);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE() {
  try {
    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

// GET - Check session
export async function GET() {
  try {
    const isValid = await validateSession();

    if (!isValid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await getSession();

    return NextResponse.json({
      authenticated: true,
      session: {
        id: session?.id,
        createdAt: session?.createdAt,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Session check failed" },
      { status: 500 }
    );
  }
}
