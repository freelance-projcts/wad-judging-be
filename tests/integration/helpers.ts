import { spawn, ChildProcess } from "child_process";
import { setTimeout as delay } from "timers/promises";

const PORT = process.env.TEST_PORT ?? "4173";
export const BASE_URL = `http://localhost:${PORT}`;

let server: ChildProcess | null = null;

export async function startServer(): Promise<void> {
  if (server) return;

  server = spawn("npx", ["next", "dev", "-p", PORT], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
    env: { ...process.env },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for dev server to start")), 60000);
    server!.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("Ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server!.on("error", reject);
  });

  // Give route compilation a brief head start.
  await delay(500);
}

export async function stopServer(): Promise<void> {
  if (!server) return;
  server.kill();
  server = null;
}

/** A minimal cookie-jar-aware fetch client for exercising the API as a browser would. */
export class TestClient {
  private cookies = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private captureCookies(res: Response) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return;
    // Node's fetch merges multiple Set-Cookie headers with ", " - good enough for our single-cookie use case.
    const [pair] = setCookie.split(";");
    const [name, value] = pair.split("=");
    if (value === "" ) {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, value);
    }
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Cookie: this.cookieHeader(),
      },
      redirect: "manual",
    });
    this.captureCookies(res);
    return res;
  }

  get(path: string) {
    return this.request(path, { method: "GET" });
  }
  post(path: string, body?: unknown) {
    return this.request(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
  }
  patch(path: string, body?: unknown) {
    return this.request(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
  }
  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@wadtest.local`;
}
