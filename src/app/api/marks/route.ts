import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePerformanceAccess, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { markEntrySchema } from "@/lib/validators";
import { calculateFinalScore } from "@/lib/scoring";
import { notifyAdmins } from "@/lib/notifications";

/**
 * List mark entries for a performance (optionally scoped further by event
 * and/or student). Used by the marks-entry screen to know which students
 * already have marks recorded, and by results/notification views.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");
    const eventId = searchParams.get("eventId");
    const studentId = searchParams.get("studentId");

    if (!performanceId) throw new ApiError(400, "performanceId is required");
    await requirePerformanceAccess(performanceId);

    const marks = await prisma.markEntry.findMany({
      where: {
        performanceId,
        ...(eventId ? { eventId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      include: { student: true, event: true, judge: { select: { id: true, name: true } } },
      orderBy: [{ studentId: "asc" }, { round: "asc" }],
    });

    return NextResponse.json({ marks });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/**
 * Create or update marks for a student/event/performance across one or more
 * rounds. Creating a brand-new round is always allowed for an assigned
 * judge. Editing an EXISTING round's marks requires the judge to hold an
 * APPROVED, unconsumed edit request for that specific mark entry (or be an
 * admin) - enforced here, not just hidden in the UI.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(markEntrySchema, body);

    await requirePerformanceAccess(data.performanceId);

    const results = [];

    for (const round of data.rounds) {
      const existing = await prisma.markEntry.findUnique({
        where: {
          studentId_eventId_performanceId_round: {
            studentId: data.studentId,
            eventId: data.eventId,
            performanceId: data.performanceId,
            round: round.round,
          },
        },
      });

      const finalScore = calculateFinalScore({
        d: round.d,
        e1: round.e1,
        e2: round.e2,
        e3: round.e3,
        e4: round.e4,
        p: round.p,
      });

      const payload = {
        dScore: round.d,
        dSupervisor: round.dSupervisor ?? null,
        e1Score: round.e1,
        e1Supervisor: round.e1Supervisor ?? null,
        e2Score: round.e2,
        e2Supervisor: round.e2Supervisor ?? null,
        e3Score: round.e3,
        e3Supervisor: round.e3Supervisor ?? null,
        e4Score: round.e4,
        e4Supervisor: round.e4Supervisor ?? null,
        penaltyScore: round.p,
        penaltySupervisor: round.pSupervisor ?? null,
        finalScore,
      };

      if (!existing) {
        const created = await prisma.markEntry.create({
          data: {
            studentId: data.studentId,
            eventId: data.eventId,
            performanceId: data.performanceId,
            round: round.round,
            judgeId: session.sub,
            ...payload,
          },
        });
        results.push(created);
        continue;
      }

      // Editing an already-submitted round.
      if (session.role !== "ADMIN") {
        const approvedRequest = await prisma.editRequest.findFirst({
          where: { markEntryId: existing.id, requesterId: session.sub, status: "APPROVED" },
          orderBy: { createdAt: "desc" },
        });
        if (!approvedRequest) {
          throw new ApiError(
            403,
            `Editing marks for round ${round.round} requires an approved edit request`
          );
        }
        // Consume the approval so it can't be reused for future edits.
        await prisma.editRequest.delete({ where: { id: approvedRequest.id } });
      }

      const updated = await prisma.markEntry.update({
        where: { id: existing.id },
        data: { judgeId: session.sub, ...payload },
      });
      results.push(updated);
    }

    const [student, event] = await Promise.all([
      prisma.student.findUnique({ where: { id: data.studentId }, select: { fullName: true } }),
      prisma.event.findUnique({ where: { id: data.eventId }, select: { name: true } }),
    ]);
    await notifyAdmins(
      "MARK_ENTRY",
      `${session.name} submitted marks for ${student?.fullName ?? "a student"} - ${event?.name ?? "an event"}`
    );

    return NextResponse.json({ marks: results }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
