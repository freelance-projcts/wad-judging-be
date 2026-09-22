import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-auth";
import { calculateFinalScore, toScoreBreakdown } from "@/lib/scoring";
import type { SessionPayload } from "@/lib/auth";
import type { MarkEntry, Prisma } from "@prisma/client";

export interface MarkScoresInput {
  D: number;
  DSupervisor: string;
  E1: number;
  E1Supervisor: string;
  E2: number;
  E2Supervisor: string;
  E3: number;
  E3Supervisor: string;
  E4: number;
  E4Supervisor: string;
  P: number;
  PSupervisor?: string;
}

function toPayload(scores: MarkScoresInput) {
  const finalScore = calculateFinalScore({
    d: scores.D,
    e1: scores.E1,
    e2: scores.E2,
    e3: scores.E3,
    e4: scores.E4,
    p: scores.P,
  });
  return {
    dScore: scores.D,
    dSupervisor: scores.DSupervisor,
    e1Score: scores.E1,
    e1Supervisor: scores.E1Supervisor,
    e2Score: scores.E2,
    e2Supervisor: scores.E2Supervisor,
    e3Score: scores.E3,
    e3Supervisor: scores.E3Supervisor,
    e4Score: scores.E4,
    e4Supervisor: scores.E4Supervisor,
    penaltyScore: scores.P,
    penaltySupervisor: scores.PSupervisor ?? null,
    finalScore,
  };
}

/**
 * Editing an existing mark entry requires the judge to hold an APPROVED,
 * unconsumed edit request for it (or be an admin) - the approval is consumed
 * (deleted) the moment it's used, so it can't be reused for a future edit.
 */
async function consumeApprovalOrThrow(
  tx: Prisma.TransactionClient,
  session: SessionPayload,
  markEntryId: string
): Promise<void> {
  if (session.role === "ADMIN") return;

  const approvedRequest = await tx.editRequest.findFirst({
    where: { markEntryId, requesterId: session.sub, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  if (!approvedRequest) {
    throw new ApiError(403, "Editing this mark requires an approved edit request");
  }
  await tx.editRequest.delete({ where: { id: approvedRequest.id } });
}

/**
 * Create-or-update by (studentId, eventId, performanceId, round). A first
 * submission for that combination is always a free create - including a
 * brand-new round 2 on an event that allows it; any subsequent submission
 * for the same combination - regardless of which judge - requires a
 * consumed approval. Round 2 is only accepted when the event's
 * `supportsMultipleRounds` flag is set.
 */
export async function upsertMarkEntry(
  session: SessionPayload,
  identity: { studentId: string; eventId: string; performanceId: string; round: number },
  scores: MarkScoresInput
): Promise<MarkEntry> {
  return prisma.$transaction(async (tx) => {
    if (identity.round === 2) {
      const event = await tx.event.findUnique({
        where: { id: identity.eventId },
        select: { supportsMultipleRounds: true },
      });
      if (!event?.supportsMultipleRounds) {
        throw new ApiError(400, "This event does not support multiple rounds");
      }
    }

    const existing = await tx.markEntry.findUnique({
      where: { studentId_eventId_performanceId_round: identity },
    });

    const payload = toPayload(scores);

    if (!existing) {
      return tx.markEntry.create({
        data: { ...identity, judgeId: session.sub, ...payload },
      });
    }

    await consumeApprovalOrThrow(tx, session, existing.id);
    return tx.markEntry.update({
      where: { id: existing.id },
      data: { judgeId: session.sub, ...payload },
    });
  });
}

export interface MarkWithPendingRequest extends MarkEntry {
  scoreBreakdown: ReturnType<typeof toScoreBreakdown>;
  pendingEditRequest: { id: string; reason: string | null; createdAt: Date } | null;
}

/**
 * Attach each student's mark(s) for a given event+performance (one row per
 * round - empty if none entered yet), each carrying whether it currently has
 * a PENDING edit request. Used by the marks-entry roster endpoints so the UI
 * can show "pending approval" instead of letting a judge file a duplicate
 * request. Two queries total regardless of how many students are passed in.
 */
export async function attachMarksToStudents<T extends { id: string }>(
  students: T[],
  eventId: string,
  performanceId: string
): Promise<(T & { marks: MarkWithPendingRequest[] })[]> {
  const studentIds = students.map((s) => s.id);
  const marks = studentIds.length
    ? await prisma.markEntry.findMany({
        where: { studentId: { in: studentIds }, eventId, performanceId },
        orderBy: { round: "asc" },
      })
    : [];

  const markIds = marks.map((m) => m.id);
  const pendingRequests = markIds.length
    ? await prisma.editRequest.findMany({
        where: { markEntryId: { in: markIds }, status: "PENDING" },
      })
    : [];
  const pendingByMarkId = new Map(pendingRequests.map((r) => [r.markEntryId, r]));

  const marksByStudentId = new Map<string, MarkWithPendingRequest[]>();
  for (const mark of marks) {
    const pending = pendingByMarkId.get(mark.id);
    const enriched: MarkWithPendingRequest = {
      ...mark,
      scoreBreakdown: toScoreBreakdown(mark),
      pendingEditRequest: pending
        ? { id: pending.id, reason: pending.reason, createdAt: pending.createdAt }
        : null,
    };
    const group = marksByStudentId.get(mark.studentId) ?? [];
    group.push(enriched);
    marksByStudentId.set(mark.studentId, group);
  }

  return students.map((student) => ({ ...student, marks: marksByStudentId.get(student.id) ?? [] }));
}

/** Edit an EXISTING mark entry by id - always requires a consumed approval (no free-create path). */
export async function editMarkEntryById(
  session: SessionPayload,
  markEntryId: string,
  scores: MarkScoresInput
): Promise<MarkEntry> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.markEntry.findUnique({ where: { id: markEntryId } });
    if (!existing) throw new ApiError(404, "Mark entry not found");

    await consumeApprovalOrThrow(tx, session, markEntryId);
    return tx.markEntry.update({
      where: { id: markEntryId },
      data: { judgeId: session.sub, ...toPayload(scores) },
    });
  });
}
