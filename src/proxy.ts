import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isJudgeRoute = pathname.startsWith("/judge");

  if (!isAdminRoute && !isJudgeRoute) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/judge", req.url));
  }

  if (isJudgeRoute && session.role !== "JUDGE") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/judge/:path*"],
};
