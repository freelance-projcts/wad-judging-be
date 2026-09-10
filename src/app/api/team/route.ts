import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { teamAssignSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(teamAssignSchema, body);

    const student = await prisma.student.update({
      where: { id: data.studentId },
      data: { team: data.team },
    });

    return NextResponse.json({ student });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
