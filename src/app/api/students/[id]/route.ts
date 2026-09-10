import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { studentUpdateSchema } from "@/lib/validators";

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

    const student = await prisma.student.update({
      where: { id },
      data,
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
