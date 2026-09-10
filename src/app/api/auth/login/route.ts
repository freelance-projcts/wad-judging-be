import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { apiErrorResponse, ApiError, parseBody } from "@/lib/api-auth";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parseBody(loginSchema, body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }
    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Invalid email or password");
    }

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
