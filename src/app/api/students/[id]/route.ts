import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { studentUpdateSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new ApiError(404, "Student not found");
    return NextResponse.json({ student });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = parseBody(studentUpdateSchema, body);

    const update: Prisma.StudentUncheckedUpdateInput = { ...data };
    const hasProvince = "province" in data;
    const hasClub = "clubId" in data;

    if (hasProvince && data.province != null) {
      // Setting a real province - switch this student to province mode.
      update.clubId = null;
    } else if (hasClub && data.clubId != null) {
      // Setting a real club - switch this student to club mode.
      const club = await prisma.club.findUnique({ where: { id: data.clubId } });
      if (!club) throw new ApiError(404, "Club not found");
      update.province = null;
    } else if (hasProvince && data.province === null) {
      // Explicitly clearing province with no club replacement would leave
      // neither set - the exactly-one invariant requires a replacement.
      throw new ApiError(400, "Cannot clear province without setting clubId");
    } else if (hasClub && data.clubId === null) {
      throw new ApiError(400, "Cannot clear clubId without setting province");
    }
    // Neither key present in the body - both existing DB values untouched.

    const student = await prisma.student.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ student });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const markCount = await prisma.markEntry.count({ where: { studentId: id } });
    if (markCount > 0) {
      throw new ApiError(409, "Cannot delete a student who already has marks recorded");
    }

    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
