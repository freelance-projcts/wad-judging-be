import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiErrorResponse } from "@/lib/api-auth";

/** Persisted notifications for the requesting admin - mark-entry activity and edit requests. */
export async function GET() {
  try {
    const session = await requireAdmin();

    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { recipientId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { recipientId: session.sub, isRead: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
