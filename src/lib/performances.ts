import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-auth";
import type { Performance } from "@prisma/client";

/**
 * Resolve "Performance 1" / "Performance 2" by their ordinal `order` field,
 * not by parsing the free-text `name` label - `order` is the stable
 * semantic identifier seeded once, `name` is just a display string.
 */
export async function getPerformanceByOrder(order: number): Promise<Performance> {
  const performance = await prisma.performance.findFirst({ where: { order } });
  if (!performance) throw new ApiError(500, `No performance configured with order=${order}`);
  return performance;
}

export const getPerformanceOne = () => getPerformanceByOrder(1);
export const getPerformanceTwo = () => getPerformanceByOrder(2);
