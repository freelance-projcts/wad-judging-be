import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

/**
 * Wipes the competition back to a clean slate for a new run: admin users,
 * performances, and events are kept (every event's status is reset to
 * OPEN); students, marks, edit requests, notifications, judge-performance
 * assignments, and all JUDGE-role users are removed. Admin only - irreversible.
 */
export async function POST() {
  try {
    await requireAdmin();

    await prisma.$transaction([
      prisma.$executeRaw`TRUNCATE TABLE "mark_entries", "edit_requests", "notifications", "judge_assignments", "students" CASCADE`,
      prisma.user.deleteMany({ where: { role: "JUDGE" } }),
      prisma.event.updateMany({ data: { status: "OPEN" } }),
    ]);

    return NextResponse.json({
      ok: true,
      message:
        "Data reset complete. Admin users, performances, and events were kept (events reset to OPEN); judge accounts and everything else were removed.",
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
