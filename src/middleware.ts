import { NextRequest, NextResponse } from "next/server";

/**
 * Origins allowed to call the API cross-origin, in addition to same-origin
 * requests (which don't need CORS at all). Configurable via env so a new
 * frontend deployment doesn't require a code change; defaults cover local
 * dev and the deployed frontend.
 */
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "https://wadtestfe.netlify.app"];

function allowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS;
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(",")
    // Strip whitespace and any accidental surrounding quotes - dashboard env
    // var UIs (Netlify, etc.) store the raw string with no dotenv parsing, so
    // pasting a .env-style `"a,b"` value literally keeps the quote characters.
    .map((o) => o.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function applyCorsHeaders(headers: Headers, origin: string | null): void {
  if (origin && allowedOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    const headers = new Headers();
    applyCorsHeaders(headers, origin);
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  applyCorsHeaders(response.headers, origin);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
