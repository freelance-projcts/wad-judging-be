import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

export type GroupingMode = "PROVINCE" | "CLUB";

const GROUPING_MODE_HEADER = "x-grouping-mode";

/**
 * The wire value of the X-Grouping-Mode header is numeric: "1" = province,
 * "2" = club. Defaults to "PROVINCE" whenever the header is missing or holds
 * anything other than exactly "2" - never throws, so a malformed or
 * unexpected value just falls back instead of breaking the request.
 */
export async function getGroupingMode(): Promise<GroupingMode> {
  const raw = (await headers()).get(GROUPING_MODE_HEADER)?.trim();
  return raw === "2" ? "CLUB" : "PROVINCE";
}

/**
 * Restricts a student query to the active grouping mode: province mode only
 * returns students that have a province, club mode only those that belong to
 * a club. Spread it into the `where` BEFORE any explicit province/clubId
 * filter, so a specific filter value narrows it further rather than being
 * overwritten.
 */
export function studentWhereForGroupingMode(mode: GroupingMode): Prisma.StudentWhereInput {
  return mode === "CLUB" ? { clubId: { not: null } } : { province: { not: null } };
}
