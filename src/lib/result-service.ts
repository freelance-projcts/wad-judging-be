import { prisma } from "@/lib/prisma";
import { toScoreBreakdown } from "@/lib/scoring";
import { getPerformanceOne, getPerformanceTwo } from "@/lib/performances";
import { provinces, provinceLabels } from "@/lib/validators";
import { ApiError } from "@/lib/api-auth";
import { getGroupingMode, type GroupingMode } from "@/lib/grouping";
import type { Gender, Province, Team } from "@prisma/client";

type TeamValue = "A" | "B";

/** Raw judge marks for a single round - D/E1-E4/P as entered (each with its supervisor), plus that round's own final score. */
export interface RoundMark {
  round: number;
  d: number;
  dSupervisor: string | null;
  e1: number;
  e1Supervisor: string | null;
  e2: number;
  e2Supervisor: string | null;
  e3: number;
  e3Supervisor: string | null;
  e4: number;
  e4Supervisor: string | null;
  p: number;
  pSupervisor: string | null;
  finalScore: number;
}

interface ScoredStudent {
  studentId: string;
  code: string;
  fullName: string;
  province: Province | null;
  clubId: string | null;
  clubName: string | null;
  team: TeamValue | null;
  finalScore: number;
  marks: RoundMark[];
}

async function requireEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

interface DecimalScoreFields {
  round: number;
  dScore: unknown;
  dSupervisor: string | null;
  e1Score: unknown;
  e1Supervisor: string | null;
  e2Score: unknown;
  e2Supervisor: string | null;
  e3Score: unknown;
  e3Supervisor: string | null;
  e4Score: unknown;
  e4Supervisor: string | null;
  penaltyScore: unknown;
  penaltySupervisor: string | null;
}

/** The raw per-judge D/E1-E4/P values (each with its supervisor) for one round, plus that round's own final score. */
function toRoundMark(entry: DecimalScoreFields): RoundMark {
  const breakdown = toScoreBreakdown(entry as Parameters<typeof toScoreBreakdown>[0]);
  return {
    round: entry.round,
    d: Number(entry.dScore),
    dSupervisor: entry.dSupervisor,
    e1: Number(entry.e1Score),
    e1Supervisor: entry.e1Supervisor,
    e2: Number(entry.e2Score),
    e2Supervisor: entry.e2Supervisor,
    e3: Number(entry.e3Score),
    e3Supervisor: entry.e3Supervisor,
    e4: Number(entry.e4Score),
    e4Supervisor: entry.e4Supervisor,
    p: Number(entry.penaltyScore),
    pSupervisor: entry.penaltySupervisor,
    finalScore: breakdown.finalScore,
  };
}

function toRoundMarks(entries: DecimalScoreFields[]): RoundMark[] {
  return entries
    .slice()
    .sort((a, b) => a.round - b.round)
    .map(toRoundMark);
}

/**
 * Average the recomputed final score across whatever rounds exist (1 for a
 * single-round event, up to 2 for one with supportsMultipleRounds - if only
 * round 1 has been submitted so far, that's the only score averaged, never
 * padded with a phantom zero for the missing round).
 */
function averageFinalScore(entries: DecimalScoreFields[]): number {
  const scores = entries.map((e) => toScoreBreakdown(e as Parameters<typeof toScoreBreakdown>[0]).finalScore);
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000;
}

/**
 * One row per student for the given event+performance, with each round's raw
 * marks attached. By default averages whatever rounds exist - used by Top
 * Eight and Performance Two, where a multi-round event's two attempts both
 * count. Pass `onlyRoundOne: true` to consider round 1 exclusively - used by
 * Team Performance and All Rounders, where a round 2 submission has no
 * effect on the score.
 */
async function scoredStudentsFor(
  eventId: string,
  performanceId: string,
  options?: { onlyRoundOne?: boolean }
): Promise<ScoredStudent[]> {
  const entries = await prisma.markEntry.findMany({
    where: { eventId, performanceId, ...(options?.onlyRoundOne ? { round: 1 } : {}) },
    include: { student: { include: { club: true } } },
  });

  const byStudent = new Map<string, { student: (typeof entries)[number]["student"]; rounds: typeof entries }>();
  for (const entry of entries) {
    const group = byStudent.get(entry.studentId) ?? { student: entry.student, rounds: [] };
    group.rounds.push(entry);
    byStudent.set(entry.studentId, group);
  }

  return [...byStudent.values()].map(({ student, rounds }) => ({
    studentId: student.id,
    code: student.code,
    fullName: student.fullName,
    province: student.province,
    clubId: student.clubId,
    clubName: student.club?.name ?? null,
    team: student.team as TeamValue | null,
    finalScore: averageFinalScore(rounds),
    marks: toRoundMarks(rounds),
  }));
}

/** Include every row tied with the cutoff-th place (1-indexed), never truncating a tie. */
function topWithTies(sorted: ScoredStudent[], cutoff: number): ScoredStudent[] {
  if (sorted.length <= cutoff) return sorted;
  const cutoffScore = sorted[cutoff - 1].finalScore;
  return sorted.filter((s) => s.finalScore >= cutoffScore);
}

function sortDescending(students: ScoredStudent[]): ScoredStudent[] {
  return students.slice().sort((a, b) => b.finalScore - a.finalScore || a.code.localeCompare(b.code));
}

/** Competition ranking: ties share a rank, the next distinct score's rank skips accordingly (1,2,2,4). */
function assignRanks<T>(sorted: T[], scoreOf: (row: T) => number): (T & { rank: number })[] {
  const ranked: (T & { rank: number })[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const tiedWithPrevious = i > 0 && scoreOf(sorted[i]) === scoreOf(sorted[i - 1]);
    ranked.push({ ...sorted[i], rank: tiedWithPrevious ? ranked[i - 1].rank : i + 1 });
  }
  return ranked;
}

interface ScoredStudentBucket {
  id: string;
  label: string;
  students: ScoredStudent[];
}

/**
 * Bucket an already-scored student list by province (fixed enum order,
 * skipping empty buckets) or by club (the distinct clubIds actually present
 * among these students, sorted by name), depending on the grouping mode.
 * Shared by getTeamPerformanceResults and getTopEightResults so the
 * top-5-per-team / top-3-with-ties logic that runs over each bucket is
 * written exactly once. Club names come straight off each ScoredStudent
 * (already joined in scoredStudentsFor), no second query needed.
 */
function buildScoredStudentBuckets(students: ScoredStudent[], mode: GroupingMode): ScoredStudentBucket[] {
  if (mode === "CLUB") {
    const byClubId = new Map<string, ScoredStudent[]>();
    for (const s of students) {
      if (!s.clubId) continue;
      const group = byClubId.get(s.clubId) ?? [];
      group.push(s);
      byClubId.set(s.clubId, group);
    }
    return [...byClubId.entries()]
      .map(([clubId, clubStudents]) => ({
        id: clubId,
        label: clubStudents[0].clubName ?? "Unknown Club",
        students: clubStudents,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return provinces
    .map((province) => ({
      id: province,
      label: provinceLabels[province],
      students: students.filter((s) => s.province === province),
    }))
    .filter((bucket) => bucket.students.length > 0);
}

// ---------------------------------------------------------------------------
// Team Performance - Performance 1 only, event-specific, province -> team -> top 5
// ---------------------------------------------------------------------------

export interface TeamPerformanceStudentRow {
  rank: number;
  studentId: string;
  code: string;
  fullName: string;
  finalScore: number;
  marks: RoundMark[];
  countedTowardTotal: boolean;
}
export interface TeamPerformanceTeamGroup {
  team: TeamValue;
  teamTotal: number;
  countedStudentCount: number;
  students: TeamPerformanceStudentRow[];
}
export interface TeamPerformanceProvinceGroup {
  province: Province;
  provinceLabel: string;
  teams: TeamPerformanceTeamGroup[];
}
export interface TeamPerformanceClubGroup {
  clubId: string;
  clubName: string;
  teams: TeamPerformanceTeamGroup[];
}
export interface TeamPerformanceResponse {
  eventId: string;
  eventName: string;
  performanceId: string;
  performanceName: string;
  groupBy: GroupingMode;
  provinces: TeamPerformanceProvinceGroup[];
  clubs: TeamPerformanceClubGroup[];
}

function omitProvinceTeam(s: ScoredStudent) {
  return { studentId: s.studentId, code: s.code, fullName: s.fullName, finalScore: s.finalScore, marks: s.marks };
}

export async function getTeamPerformanceResults(eventId: string): Promise<TeamPerformanceResponse> {
  const performance = await getPerformanceOne();
  const [event, students, mode] = await Promise.all([
    requireEvent(eventId),
    scoredStudentsFor(eventId, performance.id, { onlyRoundOne: true }),
    getGroupingMode(),
  ]);

  const eligible = students.filter((s) => s.team !== null);
  const buckets = buildScoredStudentBuckets(eligible, mode);

  // Province mode counts the top 5 per team toward teamTotal; club mode
  // counts the top 3. Either way the rest are still shown, just with
  // countedTowardTotal: false.
  const cutoff = mode === "CLUB" ? 3 : 5;
  const buildTeamGroups = (bucketStudents: ScoredStudent[]): TeamPerformanceTeamGroup[] =>
    (["A", "B"] as const).map((team) => {
      const sorted = sortDescending(bucketStudents.filter((s) => s.team === team));
      const counted = sorted.slice(0, cutoff);
      const rest = sorted.slice(cutoff);
      const rows: TeamPerformanceStudentRow[] = [
        ...counted.map((s, i) => ({ ...omitProvinceTeam(s), rank: i + 1, countedTowardTotal: true })),
        ...rest.map((s, i) => ({ ...omitProvinceTeam(s), rank: i + cutoff + 1, countedTowardTotal: false })),
      ];
      return {
        team,
        // A student's own negative score (e.g. a heavy penalty) must not pull the team total down.
        teamTotal: Math.round(counted.reduce((sum, s) => sum + Math.max(0, s.finalScore), 0) * 1000) / 1000,
        countedStudentCount: counted.length,
        students: rows,
      };
    });

  return {
    eventId,
    eventName: event.name,
    performanceId: performance.id,
    performanceName: performance.name,
    groupBy: mode,
    provinces:
      mode === "PROVINCE"
        ? buckets.map((b) => ({
            province: b.id as Province,
            provinceLabel: b.label,
            teams: buildTeamGroups(b.students),
          }))
        : [],
    clubs:
      mode === "CLUB"
        ? buckets.map((b) => ({ clubId: b.id, clubName: b.label, teams: buildTeamGroups(b.students) }))
        : [],
  };
}

// ---------------------------------------------------------------------------
// Top Eight - Performance 1 only, event-specific, ignores team, top 3 (+ties) per province
// ---------------------------------------------------------------------------

export interface TopEightStudentRow {
  rank: number;
  studentId: string;
  code: string;
  fullName: string;
  clubId: string | null;
  clubName: string | null;
  team: TeamValue | null;
  finalScore: number;
  marks: RoundMark[];
}
export interface TopEightProvinceGroup {
  province: Province;
  provinceLabel: string;
  students: TopEightStudentRow[];
}
export interface TopEightResponse {
  eventId: string;
  eventName: string;
  performanceId: string;
  performanceName: string;
  groupBy: GroupingMode;
  /** Top 3 (+ties) per province - populated only when groupBy is PROVINCE. */
  provinces: TopEightProvinceGroup[];
  /**
   * Flat top 10 (+ties) across every club-assigned student - populated only
   * when groupBy is CLUB. Unlike province mode, club mode does not bucket
   * per club first; it's one ranking across all clubs combined.
   */
  students: TopEightStudentRow[];
}

function toTopEightStudentRow(s: ScoredStudent & { rank: number }): TopEightStudentRow {
  return {
    rank: s.rank,
    studentId: s.studentId,
    code: s.code,
    fullName: s.fullName,
    clubId: s.clubId,
    clubName: s.clubName,
    team: s.team,
    finalScore: s.finalScore,
    marks: s.marks,
  };
}

export async function getTopEightResults(eventId: string): Promise<TopEightResponse> {
  const performance = await getPerformanceOne();
  const [event, students, mode] = await Promise.all([
    requireEvent(eventId),
    scoredStudentsFor(eventId, performance.id),
    getGroupingMode(),
  ]);

  const base = {
    eventId,
    eventName: event.name,
    performanceId: performance.id,
    performanceName: performance.name,
    groupBy: mode,
  };

  if (mode === "CLUB") {
    const clubStudents = students.filter((s) => s.clubId != null);
    const top10WithTies = topWithTies(sortDescending(clubStudents), 10);
    return {
      ...base,
      provinces: [],
      students: assignRanks(top10WithTies, (s) => s.finalScore).map(toTopEightStudentRow),
    };
  }

  const buckets = buildScoredStudentBuckets(students, mode);
  return {
    ...base,
    provinces: buckets.map((b) => ({
      province: b.id as Province,
      provinceLabel: b.label,
      students: assignRanks(topWithTies(sortDescending(b.students), 3), (s) => s.finalScore).map(
        toTopEightStudentRow
      ),
    })),
    students: [],
  };
}

// ---------------------------------------------------------------------------
// Performance Two - Performance 2 only, event-specific, flat top 8 (+ties at cutoff)
// ---------------------------------------------------------------------------

export interface PerformanceTwoStudentRow {
  rank: number;
  studentId: string;
  code: string;
  fullName: string;
  province: Province | null;
  provinceLabel: string | null;
  clubId: string | null;
  clubName: string | null;
  team: TeamValue | null;
  finalScore: number;
  marks: RoundMark[];
}
export interface PerformanceTwoResponse {
  eventId: string;
  eventName: string;
  performanceId: string;
  performanceName: string;
  results: PerformanceTwoStudentRow[];
}

export async function getPerformanceTwoResults(eventId: string): Promise<PerformanceTwoResponse> {
  const performance = await getPerformanceTwo();
  const [event, students] = await Promise.all([
    requireEvent(eventId),
    scoredStudentsFor(eventId, performance.id),
  ]);

  const top8WithTies = topWithTies(sortDescending(students), 8);

  return {
    eventId,
    eventName: event.name,
    performanceId: performance.id,
    performanceName: performance.name,
    results: assignRanks(top8WithTies, (s) => s.finalScore).map((s) => ({
      rank: s.rank,
      studentId: s.studentId,
      code: s.code,
      fullName: s.fullName,
      province: s.province,
      provinceLabel: s.province ? provinceLabels[s.province] : null,
      clubId: s.clubId,
      clubName: s.clubName,
      team: s.team,
      finalScore: s.finalScore,
      marks: s.marks,
    })),
  };
}

// ---------------------------------------------------------------------------
// All Rounders - not event-specific, cross-event total using each event's configured performance
// ---------------------------------------------------------------------------

export interface AllRounderEventBreakdown {
  eventId: string;
  eventName: string;
  performanceId: string;
  performanceName: string | null;
  hasMark: boolean;
  finalScore: number | null;
  marks: RoundMark[];
}
export interface AllRounderStudentRow {
  rank: number;
  studentId: string;
  code: string;
  fullName: string;
  gender: Gender;
  province: Province | null;
  provinceLabel: string | null;
  clubId: string | null;
  clubName: string | null;
  team: TeamValue | null;
  totalScore: number;
  eventsScored: number;
  events: AllRounderEventBreakdown[];
}
export interface AllRounderResponse {
  events: { id: string; name: string; performanceId: string; performanceName: string | null }[];
  students: AllRounderStudentRow[];
}

export async function getAllRounderResults(filters?: {
  gender?: Gender;
  province?: Province;
  clubId?: string;
  team?: TeamValue;
}): Promise<AllRounderResponse> {
  const performanceOne = await getPerformanceOne();

  const [students, events, performances] = await Promise.all([
    prisma.student.findMany({
      where: {
        ...(filters?.gender ? { gender: filters.gender } : {}),
        ...(filters?.province ? { province: filters.province } : {}),
        ...(filters?.clubId ? { clubId: filters.clubId } : {}),
        ...(filters?.team ? { team: filters.team as Team } : {}),
      },
      include: { club: true },
    }),
    prisma.event.findMany(),
    prisma.performance.findMany(),
  ]);
  const performanceNameById = new Map(performances.map((p) => [p.id, p.name]));
  const performanceIdFor = (event: (typeof events)[number]) => event.defaultPerformanceId ?? performanceOne.id;

  // Round 1 only - All Rounders is a "round 1 exclusively" view, same as
  // Team Performance and Performance Two (only Top Eight averages rounds).
  const eventIds = events.map((e) => e.id);
  const marks = eventIds.length
    ? await prisma.markEntry.findMany({ where: { eventId: { in: eventIds }, round: 1 } })
    : [];
  const marksByKey = new Map<string, typeof marks>();
  for (const mark of marks) {
    const key = `${mark.studentId}|${mark.eventId}|${mark.performanceId}`;
    const group = marksByKey.get(key) ?? [];
    group.push(mark);
    marksByKey.set(key, group);
  }

  const studentRows = students.map((student) => {
    const eventBreakdowns: AllRounderEventBreakdown[] = events
      .filter((event) => event.gender === student.gender)
      .map((event) => {
        const performanceId = performanceIdFor(event);
        const rounds = marksByKey.get(`${student.id}|${event.id}|${performanceId}`) ?? [];
        return {
          eventId: event.id,
          eventName: event.name,
          performanceId,
          performanceName: performanceNameById.get(performanceId) ?? null,
          hasMark: rounds.length > 0,
          finalScore: rounds.length > 0 ? averageFinalScore(rounds) : null,
          marks: toRoundMarks(rounds),
        };
      });

    const scored = eventBreakdowns.filter((e) => e.finalScore !== null);
    return {
      studentId: student.id,
      code: student.code,
      fullName: student.fullName,
      gender: student.gender,
      province: student.province,
      provinceLabel: student.province ? provinceLabels[student.province] : null,
      clubId: student.clubId,
      clubName: student.club?.name ?? null,
      team: student.team as TeamValue | null,
      // A negative event score (e.g. a heavy penalty) must not pull the cross-event total down.
      totalScore: Math.round(scored.reduce((sum, e) => sum + Math.max(0, e.finalScore ?? 0), 0) * 1000) / 1000,
      eventsScored: scored.length,
      events: eventBreakdowns,
    };
  });

  const sorted = studentRows
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore || a.code.localeCompare(b.code));

  return {
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      performanceId: performanceIdFor(e),
      performanceName: performanceNameById.get(performanceIdFor(e)) ?? null,
    })),
    students: assignRanks(sorted, (s) => s.totalScore),
  };
}

// ---------------------------------------------------------------------------
// CSV export (kept from the previous results.ts, minus `round`)
// ---------------------------------------------------------------------------

export async function getMarksForExport(performanceId: string, gender: Gender, eventId?: string) {
  return prisma.markEntry.findMany({
    where: { performanceId, student: { gender }, ...(eventId ? { eventId } : {}) },
    include: { student: { include: { club: true } }, event: true },
    orderBy: [{ event: { name: "asc" } }, { studentId: "asc" }, { round: "asc" }],
  });
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
