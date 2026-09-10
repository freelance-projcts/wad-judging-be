import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireSession();
    const performances = await prisma.performance.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ performances });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
