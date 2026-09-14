import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { changePasswordSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(changePasswordSchema, body);

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new ApiError(404, "User not found");

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Current password is incorrect");

    const passwordHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
