import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, TestClient, uniqueEmail } from "./helpers";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@wadjudging.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

describe("edit request lifecycle", () => {
  let admin: TestClient;
  let judge: TestClient;
  let performanceId: string;
  let eventId: string;
  let studentId: string;
  let markEntryId: string;

  before(async () => {
    await startServer();

    admin = new TestClient();
    await admin.post("/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    judge = new TestClient();
    await judge.post("/api/auth/register", {
      name: "Edit Request Judge",
      email: uniqueEmail("edit-judge"),
      password: "Password123",
    });
    const judgeId = (await (await judge.get("/api/auth/me")).json()).user.id;

    const performancesRes = await admin.get("/api/performances");
    performanceId = (await performancesRes.json()).performances.find(
      (p: { name: string }) => p.name === "Performance 1"
    ).id;
    await admin.post(`/api/judges/${judgeId}/performances`, { performanceId });

    const eventRes = await admin.post("/api/events", { name: `Edit Req Event ${Date.now()}`, gender: "MALE" });
    eventId = (await eventRes.json()).event.id;

    const studentRes = await admin.post("/api/students", {
      code: `E${Date.now()}`,
      fullName: "Edit Request Student",
      gender: "MALE",
      province: "SOUTHERN",
    });
    studentId = (await studentRes.json()).student.id;

    const marksRes = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 2, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    markEntryId = (await marksRes.json()).marks[0].id;
  });

  after(async () => {
    await stopServer();
  });

  it("a judge only sees their own edit requests, not everyone else's", async () => {
    await judge.post("/api/edit-requests", { markEntryId, reason: "fix D score" });

    const otherJudge = new TestClient();
    await otherJudge.post("/api/auth/register", {
      name: "Uninvolved Judge",
      email: uniqueEmail("uninvolved"),
      password: "Password123",
    });
    const res = await otherJudge.get("/api/edit-requests");
    const { requests } = await res.json();
    assert.deepEqual(requests, []);
  });

  it("prevents a judge from filing a second pending request for the same mark entry", async () => {
    const res = await judge.post("/api/edit-requests", { markEntryId, reason: "again" });
    assert.equal(res.status, 409);
  });

  it("only an admin can resolve a request", async () => {
    const listRes = await judge.get("/api/edit-requests");
    const { requests } = await listRes.json();
    const requestId = requests[0].id;

    const forbidden = await judge.patch(`/api/edit-requests/${requestId}`, { status: "APPROVED" });
    assert.equal(forbidden.status, 403);

    const rejected = await admin.patch(`/api/edit-requests/${requestId}`, { status: "REJECTED" });
    assert.equal(rejected.status, 200);
    assert.equal((await rejected.json()).request.status, "REJECTED");
  });

  it("rejects resolving the same request twice", async () => {
    const listRes = await judge.get("/api/edit-requests");
    const { requests } = await listRes.json();
    const requestId = requests[0].id;

    const res = await admin.patch(`/api/edit-requests/${requestId}`, { status: "APPROVED" });
    assert.equal(res.status, 409);
  });

  it("a REJECTED request does not grant edit access", async () => {
    const res = await judge.post("/api/marks", {
      studentId,
      eventId,
      performanceId,
      rounds: [{ round: 1, d: 9, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
    });
    assert.equal(res.status, 403);
  });
});
