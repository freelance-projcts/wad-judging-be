import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, TestClient, uniqueEmail } from "./helpers";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@wadjudging.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

describe("results aggregation", () => {
  let admin: TestClient;
  let judge: TestClient;
  let performanceId: string;
  let eventId: string;

  before(async () => {
    await startServer();

    admin = new TestClient();
    await admin.post("/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    judge = new TestClient();
    await judge.post("/api/auth/register", {
      name: "Results Judge",
      email: uniqueEmail("results-judge"),
      password: "Password123",
    });
    const judgeId = (await (await judge.get("/api/auth/me")).json()).user.id;

    const performancesRes = await admin.get("/api/performances");
    performanceId = (await performancesRes.json()).performances.find(
      (p: { name: string }) => p.name === "Performance 1"
    ).id;
    await admin.post(`/api/judges/${judgeId}/performances`, { performanceId });

    const eventRes = await admin.post("/api/events", { name: `Results Event ${Date.now()}`, gender: "FEMALE" });
    eventId = (await eventRes.json()).event.id;

    // Two students on Team A, one on Team B, with distinct scores so ranking is deterministic.
    const seedStudents: { fullName: string; team: "A" | "B"; d: number }[] = [
      { fullName: "Alice High", team: "A", d: 8 },
      { fullName: "Bob Mid", team: "A", d: 5 },
      { fullName: "Cara Low", team: "B", d: 2 },
    ];

    for (const s of seedStudents) {
      const studentRes = await admin.post("/api/students", {
        code: `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
        fullName: s.fullName,
        gender: "FEMALE",
        province: "CENTRAL",
        team: s.team,
      });
      const student = (await studentRes.json()).student;
      await judge.post("/api/marks", {
        studentId: student.id,
        eventId,
        performanceId,
        rounds: [{ round: 1, d: s.d, e1: 1, e2: 1, e3: 1, e4: 1, p: 0 }],
      });
    }
  });

  after(async () => {
    await stopServer();
  });

  it("ranks students by final score for the top-8 view", async () => {
    const res = await judge.get(`/api/results?performanceId=${performanceId}&view=top8&eventId=${eventId}`);
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data[0].student.fullName, "Alice High");
    assert.equal(data[0].rank, 1);
    assert.deepEqual(
      data.map((d: { student: { fullName: string } }) => d.student.fullName),
      ["Alice High", "Bob Mid", "Cara Low"]
    );
  });

  it("totals scores per team for the team-performance view", async () => {
    const res = await judge.get(`/api/results?performanceId=${performanceId}&view=team&eventId=${eventId}`);
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data.teamA.count, 2);
    assert.equal(data.teamB.count, 1);
    assert.ok(data.teamA.total > data.teamB.total);
  });

  it("exports a CSV for download", async () => {
    const res = await judge.get(`/api/results/download?performanceId=${performanceId}&gender=FEMALE&eventId=${eventId}`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/csv"));
    const text = await res.text();
    assert.ok(text.includes("Alice High"));
    assert.ok(text.split("\n")[0].includes("StudentID"));
  });

  it("keeps results scoped to the performance a judge is assigned to", async () => {
    const outsider = new TestClient();
    await outsider.post("/api/auth/register", {
      name: "Outsider Judge",
      email: uniqueEmail("outsider"),
      password: "Password123",
    });
    const res = await outsider.get(`/api/results?performanceId=${performanceId}&view=top8&eventId=${eventId}`);
    assert.equal(res.status, 403);
  });
});
