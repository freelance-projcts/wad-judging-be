import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, mobileNumber: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  let performances: { id: string; name: string; order: number }[] = [];
  if (user.role === "JUDGE") {
    const assignments = await prisma.judgeAssignment.findMany({
      where: { judgeId: user.id },
      include: { performance: true },
      orderBy: { performance: { order: "asc" } },
    });
    performances = assignments.map((a) => ({
      id: a.performance.id,
      name: a.performance.name,
      order: a.performance.order,
    }));
  }

  return NextResponse.json({ user, performances });
}
