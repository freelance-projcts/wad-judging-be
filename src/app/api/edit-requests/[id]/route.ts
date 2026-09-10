import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse, parseBody, ApiError } from "@/lib/api-auth";
import { editRequestResolveSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = parseBody(editRequestResolveSchema, body);

    const existing = await prisma.editRequest.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Edit request not found");
    if (existing.status !== "PENDING") throw new ApiError(409, "This request has already been resolved");

    const request = await prisma.editRequest.update({
      where: { id },
      data: { status, resolvedById: session.sub, resolvedAt: new Date() },
    });

    return NextResponse.json({ request });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
