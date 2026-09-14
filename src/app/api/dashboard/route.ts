import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

/**
 * Admin dashboard summary counts. `pendingRequests` is broken out per
 * workflow rather than a single number so additional request workflows
 * (beyond score/mark edit requests) can be added later without changing
 * the response shape - only "scoreChangeRequests" exists today.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [totalStudents, totalEvents, pendingScoreChangeRequests] = await prisma.$transaction([
      prisma.student.count(),
      prisma.event.count(),
      prisma.editRequest.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      totalStudents,
      totalEvents,
      pendingRequests: {
        total: pendingScoreChangeRequests,
        scoreChangeRequests: pendingScoreChangeRequests,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
