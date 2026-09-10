import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateFinalScore, trimmedMeanExecution } from "../../src/lib/scoring";

describe("trimmedMeanExecution", () => {
  it("drops the highest and lowest of 4 execution scores and averages the middle two", () => {
    // sorted: 1, 2, 3, 4 -> drop 1 and 4 -> average(2,3) = 2.5
    assert.equal(trimmedMeanExecution(4, 1, 3, 2), 2.5);
  });

  it("handles all-equal scores", () => {
    assert.equal(trimmedMeanExecution(5, 5, 5, 5), 5);
  });

  it("is order-independent", () => {
    const a = trimmedMeanExecution(1, 2, 3, 4);
    const b = trimmedMeanExecution(4, 3, 2, 1);
    assert.equal(a, b);
  });
});

describe("calculateFinalScore", () => {
  it("computes Final = D + (10 - trimmedMeanE) - P", () => {
    // trimmedMean(1,1,1,1) = 1 -> 10 - 1 = 9
    const score = calculateFinalScore({ d: 3, e1: 1, e2: 1, e3: 1, e4: 1, p: 0.5 });
    assert.equal(score, 3 + 9 - 0.5);
  });

  it("rounds to 2 decimal places", () => {
    const score = calculateFinalScore({ d: 2.333, e1: 1.111, e2: 1.111, e3: 1.111, e4: 1.111, p: 0 });
    assert.ok(Number.isFinite(score));
    assert.equal(score, Math.round(score * 100) / 100);
  });

  it("can go negative with heavy penalties (matches observed real-world data)", () => {
    const score = calculateFinalScore({ d: 0.4, e1: 9, e2: 9, e3: 9, e4: 9, p: 3 });
    assert.ok(score < 0);
  });

  it("rewards higher difficulty and lower execution deductions with a higher score", () => {
    const low = calculateFinalScore({ d: 1, e1: 5, e2: 5, e3: 5, e4: 5, p: 0 });
    const high = calculateFinalScore({ d: 5, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 });
    assert.ok(high > low);
  });
});
