import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { clubSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = parseBody(clubSchema, body);

    const club = await prisma.club.update({ where: { id }, data });
    return NextResponse.json({ club });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const studentCount = await prisma.student.count({ where: { clubId: id } });
    if (studentCount > 0) {
      throw new ApiError(409, "Cannot delete a club that has students assigned");
    }

    await prisma.club.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
