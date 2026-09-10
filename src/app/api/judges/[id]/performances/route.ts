import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";

const assignSchema = z.object({ performanceId: z.string().min(1) });

/** Grant a judge access to a performance. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: judgeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { performanceId } = parseBody(assignSchema, body);

    const judge = await prisma.user.findUnique({ where: { id: judgeId } });
    if (!judge || judge.role !== "JUDGE") throw new ApiError(404, "Judge not found");

    await prisma.judgeAssignment.upsert({
      where: { judgeId_performanceId: { judgeId, performanceId } },
      update: {},
      create: { judgeId, performanceId },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/** Revoke a judge's access to a performance. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: judgeId } = await params;
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");
    if (!performanceId) throw new ApiError(400, "performanceId is required");

    await prisma.judgeAssignment.deleteMany({ where: { judgeId, performanceId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
