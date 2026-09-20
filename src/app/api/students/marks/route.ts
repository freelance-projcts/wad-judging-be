import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { genders, provinces, teams, normalizeEnumParam } from "@/lib/validators";
import { attachMarksToStudents } from "@/lib/mark-service";
import type { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

/**
 * The marks-entry roster for a selected event/performance: every student
 * (filtered the same way as GET /api/students), each with their mark(s) for
 * this event+performance if any, and whether a PENDING edit request already
 * exists for it - so the UI can show "pending approval" instead of letting a
 * judge file a duplicate request.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const performanceId = searchParams.get("performanceId");
    if (!eventId) throw new ApiError(400, "eventId is required");
    if (!performanceId) throw new ApiError(400, "performanceId is required");

    await requirePerformanceAccess(performanceId);

    const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();
    const gender = normalizeEnumParam(searchParams.get("gender"), genders);
    const province = normalizeEnumParam(searchParams.get("province"), provinces);
    const team = normalizeEnumParam(searchParams.get("team"), teams);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

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

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where }),
    ]);

    const items = await attachMarksToStudents(students, eventId, performanceId);

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
