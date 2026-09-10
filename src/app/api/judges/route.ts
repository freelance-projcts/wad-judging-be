import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireAdmin();
    const judges = await prisma.user.findMany({
      where: { role: "JUDGE" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        judgeAssignments: { include: { performance: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      judges: judges.map((j) => ({
        id: j.id,
        name: j.name,
        email: j.email,
        createdAt: j.createdAt,
        performances: j.judgeAssignments.map((a) => ({ id: a.performance.id, name: a.performance.name })),
      })),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
