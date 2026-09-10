import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

/** Recent mark-entry activity across all performances, for the admin notifications feed. */
export async function GET() {
  try {
    await requireAdmin();

    const marks = await prisma.markEntry.findMany({
      include: { student: true, event: true, performance: true, judge: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ marks });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
