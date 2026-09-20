import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getPerformanceTwo } from "@/lib/performances";
import { getTopEightResults } from "@/lib/result-service";
import { attachMarksToStudents } from "@/lib/mark-service";

/**
 * Performance 2 marks-entry roster, but scoped to only the students who
 * qualified via this event's Top Eight (Performance 1 ranking) - not the
 * full roster. Each student carries their Performance 2 mark(s) if any, and
 * whether a PENDING edit request already exists for it, same shape as
 * GET /api/students/marks.
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId is required");

    const performanceTwo = await getPerformanceTwo();
    await requirePerformanceAccess(performanceTwo.id);

    const topEight = await getTopEightResults(eventId);
    const rankByStudentId = new Map(
      topEight.provinces.flatMap((p) => p.students.map((s) => [s.studentId, s.rank] as const))
    );
    const qualifiedIds = [...rankByStudentId.keys()];

    const students = qualifiedIds.length
      ? await prisma.student.findMany({ where: { id: { in: qualifiedIds } } })
      : [];

    const enriched = await attachMarksToStudents(students, eventId, performanceTwo.id);

    return NextResponse.json({
      eventId,
      eventName: topEight.eventName,
      performanceId: performanceTwo.id,
      performanceName: performanceTwo.name,
      students: enriched.map((s) => ({ ...s, topEightRank: rankByStudentId.get(s.id) ?? null })),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
