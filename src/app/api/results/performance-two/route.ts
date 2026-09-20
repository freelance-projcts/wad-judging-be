import { NextRequest, NextResponse } from "next/server";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getPerformanceTwo } from "@/lib/performances";
import { getPerformanceTwoResults } from "@/lib/result-service";

/** Performance Two: same score formula, flat top 8 (+ties at the cutoff), never truncates a tie. */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId is required");

    const performance = await getPerformanceTwo();
    await requirePerformanceAccess(performance.id);

    return NextResponse.json(await getPerformanceTwoResults(eventId));
  } catch (err) {
    return apiErrorResponse(err);
  }
}
