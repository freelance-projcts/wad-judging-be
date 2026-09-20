import { NextRequest, NextResponse } from "next/server";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getPerformanceOne } from "@/lib/performances";
import { getTopEightResults } from "@/lib/result-service";

/** Top Eight always uses Performance 1: ignores team, top 3 (+ties) per province. */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) throw new ApiError(400, "eventId is required");

    const performance = await getPerformanceOne();
    await requirePerformanceAccess(performance.id);

    return NextResponse.json(await getTopEightResults(eventId));
  } catch (err) {
    return apiErrorResponse(err);
  }
}
