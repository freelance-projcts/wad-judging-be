import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { profileUpdateSchema } from "@/lib/validators";
import { getProfileWithPerformances } from "@/lib/profile";

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await getProfileWithPerformances(session.sub);
    if (!profile) throw new ApiError(404, "User not found");
    return NextResponse.json(profile);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(profileUpdateSchema, body);

    const user = await prisma.user.update({
      where: { id: session.sub },
      data,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, mobileNumber: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
