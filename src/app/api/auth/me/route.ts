import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProfileWithPerformances } from "@/lib/profile";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const profile = await getProfileWithPerformances(session.sub);
  if (!profile) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json(profile);
}
