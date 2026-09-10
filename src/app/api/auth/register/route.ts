import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, sessionCookieOptions } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { apiErrorResponse, ApiError, parseBody } from "@/lib/api-auth";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/**
 * Self-registration always creates a JUDGE account with no performance
 * assignments. Admin accounts are provisioned out-of-band (seed/DB) and
 * performance access is granted explicitly by an admin afterwards - this
 * keeps the default the least-privileged option.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parseBody(registerSchema, body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "JUDGE",
      },
    });

    const token = await signSession({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set({ ...sessionCookieOptions(SEVEN_DAYS), value: token });
    return res;
  } catch (err) {
    return apiErrorResponse(err);
  }
}
