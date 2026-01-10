/**
 * Admin Authentication
 *
 * Hybrid approach: JWT + Server-side session validation
 * - JWT stored in HTTP-only cookie
 * - Session validated on each request
 */

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "./db";
import { z } from "zod";

// Get and validate JWT secret at runtime (throws if not configured)
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL: JWT_SECRET environment variable is not set");
  }
  return secret;
}

const SESSION_COOKIE = "devatar_session";
const SESSION_DURATION_HOURS = 24;

// Validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

interface JWTPayload {
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Create a new admin session
 */
export async function createSession(
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  // Create session in database
  const session = await prisma.adminSession.create({
    data: {
      token: crypto.randomUUID(),
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  // Create JWT
  const token = jwt.sign(
    { sessionId: session.id } as JWTPayload,
    getJwtSecret(),
    { expiresIn: `${SESSION_DURATION_HOURS}h` }
  );

  return token;
}

/**
 * Validate the current session
 */
export async function validateSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return false;
    }

    // Verify JWT
    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;

    // Check session in database
    const session = await prisma.adminSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session) {
      return false;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return false;
    }

    // Update last active time (sliding window)
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current session info
 */
export async function getSession(): Promise<{
  id: string;
  createdAt: Date;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;

    const session = await prisma.adminSession.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, createdAt: true },
    });

    return session;
  } catch {
    return null;
  }
}

/**
 * Verify admin credentials (username + password)
 * Uses timing-safe comparison for username to prevent timing attacks
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUsername || !adminPasswordHash) {
    console.error("ADMIN_USERNAME or ADMIN_PASSWORD_HASH not configured");
    return false;
  }

  // Timing-safe username comparison
  const usernameBuffer = Buffer.from(username.toLowerCase());
  const expectedBuffer = Buffer.from(adminUsername.toLowerCase());

  // Pad to same length to prevent length-based timing attacks
  const maxLength = Math.max(usernameBuffer.length, expectedBuffer.length);
  const paddedUsername = Buffer.alloc(maxLength);
  const paddedExpected = Buffer.alloc(maxLength);
  usernameBuffer.copy(paddedUsername);
  expectedBuffer.copy(paddedExpected);

  const crypto = require("crypto");
  const usernameValid =
    paddedUsername.length === paddedExpected.length &&
    crypto.timingSafeEqual(paddedUsername, paddedExpected);

  // Always verify password (even if username is wrong) to prevent timing attacks
  const passwordValid = await bcrypt.compare(password, adminPasswordHash);

  return usernameValid && passwordValid;
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  });
}

/**
 * Clear session cookie and delete from database
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (token) {
      const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;
      await prisma.adminSession
        .delete({
          where: { id: payload.sessionId },
        })
        .catch(() => {});
    }

    cookieStore.delete(SESSION_COOKIE);
  } catch {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  }
}

/**
 * Cleanup expired sessions (call periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.adminSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

/**
 * Hash a password (for initial setup)
 * Run: node -e "require('./src/lib/auth').hashPassword('yourpassword').then(console.log)"
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Export cookie name for middleware
 */
export const SESSION_COOKIE_NAME = SESSION_COOKIE;
