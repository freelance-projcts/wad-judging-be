/**
 * WAD Judging score calculation.
 *
 * Follows the standard artistic-gymnastics Code of Points model implied by the
 * D / E1-E4 / P fields captured in the marks-entry form:
 *   - D  = Difficulty score, entered directly by the judge.
 *   - E1-E4 = execution deductions from up to 4 execution judges. With a panel
 *     of 4, the highest and lowest are discarded and the middle two are
 *     averaged (standard FIG trimmed-mean rule) to reduce the impact of an
 *     outlier judge.
 *   - P  = Penalty deductions (e.g. line faults, time faults).
 *
 * Final = D + (10 - trimmedMeanE) - P
 */

export interface RawScores {
  d: number;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  p: number;
}

export function trimmedMeanExecution(e1: number, e2: number, e3: number, e4: number): number {
  const scores = [e1, e2, e3, e4].sort((a, b) => a - b);
  const middle = scores.slice(1, 3);
  return (middle[0] + middle[1]) / 2;
}

export function calculateFinalScore({ d, e1, e2, e3, e4, p }: RawScores): number {
  const eAvg = trimmedMeanExecution(e1, e2, e3, e4);
  const final = d + (10 - eAvg) - p;
  return Math.round(final * 100) / 100;
}
