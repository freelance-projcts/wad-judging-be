import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { apiErrorResponse, ApiError, parseBody } from "@/lib/api-auth";

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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
      },
      token,
    });
    res.cookies.set({ ...sessionCookieOptions(SESSION_MAX_AGE_SECONDS), value: token });
    return res;
  } catch (err) {
    return apiErrorResponse(err);
  }
}
