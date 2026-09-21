import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireJudge, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { editRequestCreateSchema } from "@/lib/validators";
import { notifyAdmins } from "@/lib/notifications";

/** Admins see every request; judges see only the ones they made. */
export async function GET() {
  try {
    const session = await requireSession();

    const requests = await prisma.editRequest.findMany({
      where: session.role === "ADMIN" ? {} : { requesterId: session.sub },
      include: {
        requester: { select: { id: true, name: true } },
        markEntry: {
          include: { student: true, event: true, performance: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/** A judge asks to edit marks they (or a co-judge) already submitted for their assigned performance. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireJudge();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(editRequestCreateSchema, body);

    const markEntry = await prisma.markEntry.findUnique({
      where: { id: data.markEntryId },
      include: { student: { select: { fullName: true } }, event: { select: { name: true } } },
    });
    if (!markEntry) throw new ApiError(404, "Mark entry not found");

    const existingPending = await prisma.editRequest.findFirst({
      where: { markEntryId: data.markEntryId, requesterId: session.sub, status: "PENDING" },
    });
    if (existingPending) {
      throw new ApiError(409, "You already have a pending edit request for this mark entry");
    }

    const request = await prisma.editRequest.create({
      data: {
        markEntryId: data.markEntryId,
        requesterId: session.sub,
        reason: data.reason ?? null,
      },
    });

    await notifyAdmins(
      "EDIT_REQUEST",
      `${session.name} requested to edit marks for ${markEntry.student.fullName} - ${markEntry.event.name}`
    );

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
