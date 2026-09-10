import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { profileUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(profileUpdateSchema, body);

    const user = await prisma.user.update({
      where: { id: session.sub },
      data,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
