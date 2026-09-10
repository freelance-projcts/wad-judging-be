import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, TestClient, uniqueEmail } from "./helpers";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@wadjudging.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

describe("marks entry + edit-request authorization", () => {
  let admin: TestClient;
  let judge: TestClient;
  let performanceId: string;
  let eventId: string;
  let studentId: string;
  let markEntryId: string;

  before(async () => {
    await startServer();

    admin = new TestClient();
    const adminLogin = await admin.post("/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert.equal(adminLogin.status, 200, "seed admin must exist - run `npm run db:seed` first");

    judge = new TestClient();
    const judgeEmail = uniqueEmail("marks-judge");
    await judge.post("/api/auth/register", { name: "Marks Judge", email: judgeEmail, password: "Password123" });

    const performancesRes = await admin.get("/api/performances");
    const { performances } = await performancesRes.json();
    performanceId = performances.find((p: { name: string }) => p.name === "Performance 1")!.id;

    const eventRes = await admin.post("/api/events", { name: `Test Event ${Date.now()}`, gender: "MALE" });
    eventId = (await eventRes.json()).event.id;

    const studentRes = await admin.post("/api/students", {
      code: `T${Date.now()}`,
      fullName: "Test Student",
      gender: "MALE",
      province: "WESTERN",
    });
    studentId = (await studentRes.json()).student.id;
  });

  after(async () => {
    await stopServer();
  });

  it("blocks a judge who is not assigned to the performance", async () => {
    const res = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 3, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    assert.equal(res.status, 403);
  });

  it("allows the assigned judge to submit round 1 and computes the final score", async () => {
    const me = await judge.get("/api/auth/me");
    const judgeId = (await me.json()).user.id;
    const grant = await admin.post(`/api/judges/${judgeId}/performances`, { performanceId });
    assert.equal(grant.status, 201);

    const res = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 3, e1: 1, e2: 1, e3: 1, e4: 1, p: 0.5 }],
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    // D(3) + (10 - trimmedMean(1,1,1,1)=1) - P(0.5) = 3 + 9 - 0.5 = 11.5
    assert.equal(Number(body.marks[0].finalScore), 11.5);
  });

  it("rejects a direct re-submission of the same round without an approved edit request", async () => {
    const listRes = await judge.get(`/api/marks?performanceId=${performanceId}&eventId=${eventId}&studentId=${studentId}`);
    const { marks } = await listRes.json();
    markEntryId = marks[0].id;

    const res = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 5, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    assert.equal(res.status, 403);
  });

  it("allows editing round 1 once an admin approves the edit request, then blocks further edits", async () => {
    const createReq = await judge.post("/api/edit-requests", { markEntryId, reason: "typo in D score" });
    assert.equal(createReq.status, 201);
    const requestId = (await createReq.json()).request.id;

    const listRes = await admin.get("/api/edit-requests");
    const { requests } = await listRes.json();
    assert.ok(requests.some((r: { id: string }) => r.id === requestId));

    const approve = await admin.patch(`/api/edit-requests/${requestId}`, { status: "APPROVED" });
    assert.equal(approve.status, 200);

    const editRes = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 5, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    assert.equal(editRes.status, 201);

    // The approval is consumed - trying again should be blocked once more.
    const secondEdit = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 6, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    assert.equal(secondEdit.status, 403);
  });

  it("allows adding a brand-new round without any approval", async () => {
    const res = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 2, d: 4, e1: 2, e2: 2, e3: 2, e4: 2, p: 0 }],
    });
    assert.equal(res.status, 201);
  });

  it("keeps a second, unassigned judge locked out of this performance's marks", async () => {
    const otherJudge = new TestClient();
    await otherJudge.post("/api/auth/register", {
      name: "Other Judge",
      email: uniqueEmail("other-judge"),
      password: "Password123",
    });
    const res = await otherJudge.get(`/api/marks?performanceId=${performanceId}`);
    assert.equal(res.status, 403);
  });
});
