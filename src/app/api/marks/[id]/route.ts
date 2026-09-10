import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const mark = await prisma.markEntry.findUnique({
      where: { id },
      include: { student: true, event: true, performance: true, judge: { select: { id: true, name: true } } },
    });
    if (!mark) throw new ApiError(404, "Mark entry not found");

    if (session.role !== "ADMIN") {
      const assignment = await prisma.judgeAssignment.findUnique({
        where: { judgeId_performanceId: { judgeId: session.sub, performanceId: mark.performanceId } },
      });
      if (!assignment) throw new ApiError(403, "Not authorized for this performance");
    }

    return NextResponse.json({ mark });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
