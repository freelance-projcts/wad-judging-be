import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError, parseBody } from "@/lib/api-auth";
import { markScoresSchema } from "@/lib/validators";
import { toScoreBreakdown } from "@/lib/scoring";
import { editMarkEntryById } from "@/lib/mark-service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const mark = await prisma.markEntry.findUnique({
      where: { id },
      include: { student: true, event: true, performance: true, judge: { select: { id: true, name: true } } },
    });
    if (!mark) throw new ApiError(404, "Mark entry not found");

    return NextResponse.json({ mark: { ...mark, scoreBreakdown: toScoreBreakdown(mark) } });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/** Edit an existing mark entry's scores. Always requires an approved, unconsumed edit request (or admin). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const scores = parseBody(markScoresSchema, body);

    const existing = await prisma.markEntry.findUnique({ where: { id }, select: { performanceId: true } });
    if (!existing) throw new ApiError(404, "Mark entry not found");
    await requirePerformanceAccess(existing.performanceId);

    const mark = await editMarkEntryById(session, id, scores);
    return NextResponse.json({ mark: { ...mark, scoreBreakdown: toScoreBreakdown(mark) } });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
