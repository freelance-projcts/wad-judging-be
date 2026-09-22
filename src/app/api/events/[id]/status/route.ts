import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { eventStatusSchema } from "@/lib/validators";

/** Change an event's status (OPEN / PERFORMANCE_1_COMPLETE / PERFORMANCE_2_COMPLETE). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = parseBody(eventStatusSchema, body);

    const event = await prisma.event.update({ where: { id }, data: { status: data.status } });
    return NextResponse.json({ event });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
