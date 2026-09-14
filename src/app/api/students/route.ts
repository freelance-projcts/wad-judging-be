import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { studentSchema, genders, provinces, teams, normalizeEnumParam } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

/**
 * List students. Available to any authenticated user (admin manages students;
 * judges need this to search/filter students while entering marks) - search,
 * gender/province/team filters, and pagination are all applied server-side.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();
    const gender = normalizeEnumParam(searchParams.get("gender"), genders);
    const province = normalizeEnumParam(searchParams.get("province"), provinces);
    const team = normalizeEnumParam(searchParams.get("team"), teams);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // An unrecognized gender/province/team means nothing can match - return
    // an empty page instead of passing an invalid value straight into a
    // Prisma enum filter (which throws a 500).
    if (gender.invalid || province.invalid || team.invalid) {
      return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0 });
    }

    const where: Prisma.StudentWhereInput = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }
    if (gender.value) where.gender = gender.value;
    if (province.value) where.province = province.value;
    if (team.value) where.team = team.value;

    const [items, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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
        team: data.team ?? null,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
