import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

/**
 * Wipes the competition back to a clean slate for a new run: users,
 * performances, and events are kept (every event's status is reset to
 * OPEN); students, marks, edit requests, notifications, and judge-performance
 * assignments are all truncated. Admin only - irreversible.
 */
export async function POST() {
  try {
    await requireAdmin();

    await prisma.$transaction([
      prisma.$executeRaw`TRUNCATE TABLE "mark_entries", "edit_requests", "notifications", "judge_assignments", "students" CASCADE`,
      prisma.event.updateMany({ data: { status: "OPEN" } }),
    ]);

    return NextResponse.json({
      ok: true,
      message:
        "Data reset complete. Users, performances, and events were kept; all events were reset to OPEN.",
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
