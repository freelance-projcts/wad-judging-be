import { prisma } from "@/lib/prisma";
import type { NotificationType, Prisma } from "@prisma/client";

/**
 * Fan out one Notification row per current admin. Notifications are
 * per-recipient (User -> Notification), so "notify admins" means creating a
 * row for every admin that exists right now - there's no broadcast/shared
 * notification concept.
 */
export async function notifyAdmins(
  type: NotificationType,
  message: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const admins = await client.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) return;

  await client.notification.createMany({
    data: admins.map((admin) => ({ recipientId: admin.id, type, message })),
  });
}
