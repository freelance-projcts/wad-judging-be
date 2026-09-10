import { prisma } from "./prisma";
import type { Gender } from "@prisma/client";

/** Best (highest) final score per student for a given event/performance, across all rounds. */
async function bestScoresByStudent(performanceId: string, eventId: string) {
  const entries = await prisma.markEntry.findMany({
    where: { performanceId, eventId },
    include: { student: true },
  });

  const bestByStudent = new Map<string, { student: (typeof entries)[number]["student"]; score: number }>();
  for (const entry of entries) {
    const score = Number(entry.finalScore);
    const existing = bestByStudent.get(entry.studentId);
    if (!existing || score > existing.score) {
      bestByStudent.set(entry.studentId, { student: entry.student, score });
    }
  }
  return [...bestByStudent.values()];
}

export async function getTeamPerformance(performanceId: string, eventId: string) {
  const best = await bestScoresByStudent(performanceId, eventId);
  const result = {
    teamA: { total: 0, count: 0 },
    teamB: { total: 0, count: 0 },
  };
  for (const { student, score } of best) {
    if (student.team === "A") {
      result.teamA.total += score;
      result.teamA.count += 1;
    } else if (student.team === "B") {
      result.teamB.total += score;
      result.teamB.count += 1;
    }
  }
  return {
    teamA: {
      total: Math.round(result.teamA.total * 100) / 100,
      count: result.teamA.count,
      average: result.teamA.count ? Math.round((result.teamA.total / result.teamA.count) * 100) / 100 : 0,
    },
    teamB: {
      total: Math.round(result.teamB.total * 100) / 100,
      count: result.teamB.count,
      average: result.teamB.count ? Math.round((result.teamB.total / result.teamB.count) * 100) / 100 : 0,
    },
  };
}

export async function getTopN(performanceId: string, eventId: string, limit = 8) {
  const best = await bestScoresByStudent(performanceId, eventId);
  return best
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({ rank: index + 1, student: entry.student, score: entry.score }));
}

export async function getAllRounders(performanceId: string, gender: Gender) {
  const entries = await prisma.markEntry.findMany({
    where: { performanceId, student: { gender } },
    include: { student: true, event: true },
  });

  const byStudent = new Map<
    string,
    { student: (typeof entries)[number]["student"]; total: number; events: Map<string, number> }
  >();

  for (const entry of entries) {
    const score = Number(entry.finalScore);
    let record = byStudent.get(entry.studentId);
    if (!record) {
      record = { student: entry.student, total: 0, events: new Map() };
      byStudent.set(entry.studentId, record);
    }
    const currentBest = record.events.get(entry.eventId) ?? -Infinity;
    if (score > currentBest) {
      record.events.set(entry.eventId, score);
    }
  }

  const ranked = [...byStudent.values()]
    .map((r) => ({
      student: r.student,
      eventsCompeted: r.events.size,
      total: Math.round([...r.events.values()].reduce((a, b) => a + b, 0) * 100) / 100,
    }))
    .filter((r) => r.eventsCompeted > 1)
    .sort((a, b) => b.total - a.total);

  return ranked.map((r, i) => ({ rank: i + 1, ...r }));
}

export async function getResultsForExport(performanceId: string, gender: Gender, eventId?: string) {
  const entries = await prisma.markEntry.findMany({
    where: { performanceId, student: { gender }, ...(eventId ? { eventId } : {}) },
    include: { student: true, event: true },
    orderBy: [{ event: { name: "asc" } }, { studentId: "asc" }, { round: "asc" }],
  });
  return entries;
}

export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => {
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
