/**
 * WAD Judging score calculation.
 *
 * For every Student + Event + Performance, a judge records six marks:
 *   - D  = Difficulty score.
 *   - E1-E4 = execution scores from a panel of 4 execution judges. The
 *     highest and lowest are discarded (only one instance of each, even if
 *     duplicated) and the remaining two are averaged.
 *   - P  = Penalty deductions.
 *
 * Final = E_average + D - P
 */

export interface RawScores {
  d: number;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  p: number;
}

export interface ExecutionScoreBreakdown {
  /** The two middle values (ascending) that were averaged into eAverage. */
  countedEScores: [number, number];
  /** The one min-instance and one max-instance dropped. Sorting and taking
   * the middle two indices means a repeated min/max value is never dropped
   * twice - e.g. [8,8,9,10] sorted stays [8,8,9,10], middle two are [8,9],
   * dropping exactly one 8 and the one 10. */
  ignoredEScores: { min: number; max: number };
  eAverage: number;
}

export interface ScoreBreakdown extends ExecutionScoreBreakdown {
  d: number;
  p: number;
  finalScore: number;
}

export function analyzeExecutionScores(
  e1: number,
  e2: number,
  e3: number,
  e4: number
): ExecutionScoreBreakdown {
  const sorted = [e1, e2, e3, e4].slice().sort((a, b) => a - b);
  const countedEScores: [number, number] = [sorted[1], sorted[2]];
  const eAverage = (countedEScores[0] + countedEScores[1]) / 2;
  return { countedEScores, ignoredEScores: { min: sorted[0], max: sorted[3] }, eAverage };
}

/** @deprecated use analyzeExecutionScores(...).eAverage */
export function trimmedMeanExecution(e1: number, e2: number, e3: number, e4: number): number {
  return analyzeExecutionScores(e1, e2, e3, e4).eAverage;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** FINAL = E_average + D - P. */
export function calculateScoreBreakdown({ d, e1, e2, e3, e4, p }: RawScores): ScoreBreakdown {
  const { countedEScores, ignoredEScores, eAverage } = analyzeExecutionScores(e1, e2, e3, e4);
  return {
    d,
    p,
    countedEScores,
    ignoredEScores,
    eAverage: round3(eAverage),
    finalScore: round3(eAverage + d - p),
  };
}

export function calculateFinalScore(raw: RawScores): number {
  return calculateScoreBreakdown(raw).finalScore;
}

/** Anything Number() can coerce - a plain number/string, or Prisma's Decimal (which stringifies). */
type Numeric = number | string | { toString(): string };

/** Build a ScoreBreakdown from a persisted MarkEntry row's Decimal fields. */
export function toScoreBreakdown(entry: {
  dScore: Numeric;
  e1Score: Numeric;
  e2Score: Numeric;
  e3Score: Numeric;
  e4Score: Numeric;
  penaltyScore: Numeric;
}): ScoreBreakdown {
  return calculateScoreBreakdown({
    d: Number(entry.dScore),
    e1: Number(entry.e1Score),
    e2: Number(entry.e2Score),
    e3: Number(entry.e3Score),
    e4: Number(entry.e4Score),
    p: Number(entry.penaltyScore),
  });
}
