import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { studentSchema } from "@/lib/validators";
import type { Gender, Province, Team, Prisma } from "@prisma/client";

/**
 * List students. Available to any authenticated user (admin manages students;
 * judges need this to search/filter students while entering marks) - search
 * and gender/province/team filters are all applied server-side.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const gender = searchParams.get("gender") as Gender | null;
    const province = searchParams.get("province") as Province | null;
    const team = searchParams.get("team") as Team | null;

    const where: Prisma.StudentWhereInput = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }
    if (gender) where.gender = gender;
    if (province) where.province = province;
    if (team) where.team = team;

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(studentSchema, body);

    const student = await prisma.student.create({
      data: {
        code: data.code,
        fullName: data.fullName,
        gender: data.gender,
        province: data.province,
        photoUrl: data.photoUrl ?? null,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
