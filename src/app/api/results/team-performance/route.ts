import { NextRequest, NextResponse } from "next/server";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getPerformanceOne } from "@/lib/performances";
import { getTeamPerformanceResults } from "@/lib/result-service";

/** Team Performance always uses Performance 1: province -> Team A/B -> top 5 -> teamTotal. */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId is required");

    const performance = await getPerformanceOne();
    await requirePerformanceAccess(performance.id);

    return NextResponse.json(await getTeamPerformanceResults(eventId));
  } catch (err) {
    return apiErrorResponse(err);
  }
}
