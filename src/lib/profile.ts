import { prisma } from "@/lib/prisma";

/** Shared by GET /api/profile and GET /api/auth/me - the current user plus their assigned performances, if any. */
export async function getProfileWithPerformances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, mobileNumber: true },
  });
  if (!user) return null;

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

  return { user, performances };
}
