import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { eventSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = parseBody(eventSchema, body);

    const event = await prisma.event.update({ where: { id }, data });
    return NextResponse.json({ event });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const markCount = await prisma.markEntry.count({ where: { eventId: id } });
    if (markCount > 0) {
      throw new ApiError(409, "Cannot delete an event that already has marks recorded");
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
