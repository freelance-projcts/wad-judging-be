import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, TestClient, uniqueEmail } from "./helpers";

describe("authentication", () => {
  before(async () => {
    await startServer();
  });

  after(async () => {
    await stopServer();
  });

  it("registers a new account as a JUDGE with no performance access", async () => {
    const client = new TestClient();
    const email = uniqueEmail("register");

    const res = await client.post("/api/auth/register", {
      name: "Test Judge",
      email,
      password: "Password123",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.role, "JUDGE");

    const me = await client.get("/api/auth/me");
    const meBody = await me.json();
    assert.equal(meBody.user.email, email);
    assert.deepEqual(meBody.performances, []);
  });

  it("rejects duplicate email registration", async () => {
    const client = new TestClient();
    const email = uniqueEmail("dupe");

    await client.post("/api/auth/register", { name: "First", email, password: "Password123" });
    const res = await client.post("/api/auth/register", { name: "Second", email, password: "Password123" });
    assert.equal(res.status, 409);
  });

  it("rejects an invalid password on login", async () => {
    const client = new TestClient();
    const email = uniqueEmail("badlogin");
    await client.post("/api/auth/register", { name: "Login Test", email, password: "Password123" });
    await client.post("/api/auth/logout");

    const res = await client.post("/api/auth/login", { email, password: "WrongPassword" });
    assert.equal(res.status, 401);
  });

  it("logs out and clears the session", async () => {
    const client = new TestClient();
    const email = uniqueEmail("logout");
    await client.post("/api/auth/register", { name: "Logout Test", email, password: "Password123" });

    await client.post("/api/auth/logout");
    const me = await client.get("/api/auth/me");
    const body = await me.json();
    assert.equal(body.user, null);
  });

  it("blocks admin API routes for an unauthenticated request", async () => {
    const client = new TestClient();
    const res = await client.get("/api/judges");
    assert.equal(res.status, 401);
  });
});
