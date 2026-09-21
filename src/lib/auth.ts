import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "wad_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "4h";

/** Session/cookie lifetime in seconds - kept in sync with JWT_EXPIRES_IN above. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * parseInt(JWT_EXPIRES_IN);

function secretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface SessionPayload {
  sub: string; // user id
  role: Role;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      sub: payload.sub as string,
      role: payload.role as Role,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * Read + verify the session from the Next.js `cookies()` API (Server Components /
 * Route Handlers). Falls back to an `Authorization: Bearer <token>` header so
 * non-browser clients (Postman, mobile, curl) can authenticate with the token
 * returned from /api/auth/login or /api/auth/register instead of a cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  let token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length);
    }
  }
  if (!token) return null;
  return verifySession(token);
}

/** Read + verify the session from a NextRequest (middleware). Also accepts a Bearer token. */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  let token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length);
    }
  }
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
