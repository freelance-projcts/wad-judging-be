import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession, apiErrorResponse, parseBody } from "@/lib/api-auth";
import { clubSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

/** List clubs. Available to any authenticated user (e.g. for a student-create dropdown). */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();

    const where: Prisma.ClubWhereInput = {};
    if (q) where.name = { contains: q, mode: "insensitive" };

    const clubs = await prisma.club.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json({ clubs });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const data = parseBody(clubSchema, body);

    const club = await prisma.club.create({ data });
    return NextResponse.json({ club }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
