import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { eventSchema, genders, normalizeEnumParam } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") ?? searchParams.get("q"))?.trim();
    const gender = normalizeEnumParam(searchParams.get("gender"), genders);

    // An unrecognized gender means nothing can match - return an empty
    // result instead of passing an invalid value straight into a Prisma
    // enum filter (which throws a 500).
    if (gender.invalid) {
      return NextResponse.json({ events: [] });
    }

    const where: Prisma.EventWhereInput = {};
    if (gender.value) where.gender = gender.value;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const events = await prisma.event.findMany({
      where,
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
