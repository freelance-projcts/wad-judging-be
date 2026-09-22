import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePerformanceAccess, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { markEntrySchema, genders, provinces, teams, normalizeEnumParam } from "@/lib/validators";
import { toScoreBreakdown } from "@/lib/scoring";
import { upsertMarkEntry } from "@/lib/mark-service";
import { notifyAdmins } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

/** List mark entries. Filters are all optional; any authenticated user may query any performance. */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");
    const eventId = searchParams.get("eventId");
    const studentId = searchParams.get("studentId");
    const gender = normalizeEnumParam(searchParams.get("gender"), genders);
    const province = normalizeEnumParam(searchParams.get("province"), provinces);
    const team = normalizeEnumParam(searchParams.get("team"), teams);

    if (gender.invalid || province.invalid || team.invalid) {
      return NextResponse.json({ marks: [] });
    }

    const where: Prisma.MarkEntryWhereInput = {};

    if (performanceId) where.performanceId = performanceId;

    if (eventId) where.eventId = eventId;
    if (studentId) where.studentId = studentId;
    if (gender.value || province.value || team.value) {
      where.student = {
        ...(gender.value ? { gender: gender.value } : {}),
        ...(province.value ? { province: province.value } : {}),
        ...(team.value ? { team: team.value } : {}),
      };
    }

    const marks = await prisma.markEntry.findMany({
      where,
      include: { student: true, event: true, judge: { select: { id: true, name: true } } },
      orderBy: [{ studentId: "asc" }, { eventId: "asc" }, { round: "asc" }],
    });

    return NextResponse.json({
      marks: marks.map((mark) => ({ ...mark, scoreBreakdown: toScoreBreakdown(mark) })),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/**
 * Create or update the single mark entry for a student/event/performance.
 * Creating a brand-new entry is always allowed for an assigned judge.
 * Editing an existing entry requires the judge to hold an APPROVED,
 * unconsumed edit request for it (or be an admin).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(markEntrySchema, body);

    await requirePerformanceAccess(data.performanceId);

    const mark = await upsertMarkEntry(
      session,
      { studentId: data.studentId, eventId: data.eventId, performanceId: data.performanceId, round: data.round },
      data.scores
    );

    const [student, event] = await Promise.all([
      prisma.student.findUnique({ where: { id: data.studentId }, select: { fullName: true } }),
      prisma.event.findUnique({ where: { id: data.eventId }, select: { name: true } }),
    ]);
    await notifyAdmins(
      "MARK_ENTRY",
      `${session.name} submitted marks for ${student?.fullName ?? "a student"} - ${event?.name ?? "an event"}`
    );

    return NextResponse.json(
      { mark: { ...mark, scoreBreakdown: toScoreBreakdown(mark) } },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
