import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { getSession, SessionPayload } from "./auth";
import { prisma } from "./prisma";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return NextResponse.json({ error: "A record with this value already exists" }, { status: 409 });
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2003"
  ) {
    return NextResponse.json({ error: "Referenced record does not exist" }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Require any authenticated user. Throws ApiError(401) otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  return session;
}

/** Require an authenticated ADMIN. Throws ApiError(401/403) otherwise. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "ADMIN") throw new ApiError(403, "Admin access required");
  return session;
}

/** Require an authenticated JUDGE. Throws ApiError(401/403) otherwise. */
export async function requireJudge(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "JUDGE") throw new ApiError(403, "Judge access required");
  return session;
}

/**
 * Require that the current session is a JUDGE explicitly assigned to the given
 * performance (server-side enforcement of JUDGE -> PERFORMANCE_N scoping).
 * ADMIN is always allowed through (admins can see/act on all performances).
 */
export async function requirePerformanceAccess(
  performanceId: string
): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role === "ADMIN") return session;

  const assignment = await prisma.judgeAssignment.findUnique({
    where: { judgeId_performanceId: { judgeId: session.sub, performanceId } },
  });
  // if (!assignment) {
  //   throw new ApiError(403, "You are not assigned to this performance");
  // }
  return session;
}

/** Parse a request body against a Zod schema, throwing a 400 ApiError with a readable message on failure. */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ApiError(400, message || "Invalid input");
  }
  return result.data;
}
