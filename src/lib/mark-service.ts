import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-auth";
import { calculateFinalScore } from "@/lib/scoring";
import type { SessionPayload } from "@/lib/auth";
import type { MarkEntry, Prisma } from "@prisma/client";

export interface MarkScoresInput {
  D: number;
  E1: number;
  E2: number;
  E3: number;
  E4: number;
  P: number;
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
    e1Score: scores.E1,
    e2Score: scores.E2,
    e3Score: scores.E3,
    e4Score: scores.E4,
    penaltyScore: scores.P,
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
