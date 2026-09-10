import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { eventSchema } from "@/lib/validators";
import type { Gender } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const gender = searchParams.get("gender") as Gender | null;

    const events = await prisma.event.findMany({
      where: gender ? { gender } : undefined,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ events });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(eventSchema, body);

    const event = await prisma.event.create({ data });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
