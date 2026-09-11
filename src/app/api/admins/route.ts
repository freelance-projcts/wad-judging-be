import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { apiErrorResponse, ApiError, parseBody, requireAdmin } from "@/lib/api-auth";

/**
 * Admin accounts are never self-registered (see /api/auth/register, which
 * always creates a JUDGE). This is the protected mechanism for provisioning
 * new admins - only an existing authenticated ADMIN can call it.
 */
export async function GET() {
  try {
    await requireAdmin();
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true, email: true, mobileNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ admins });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const data = parseBody(registerSchema, body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);
    const admin = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        mobileNumber: data.mobileNumber || undefined,
        role: "ADMIN",
      },
    });

    return NextResponse.json(
      {
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          mobileNumber: admin.mobileNumber,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
