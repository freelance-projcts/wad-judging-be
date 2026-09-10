import { NextRequest, NextResponse } from "next/server";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getTeamPerformance, getTopN, getAllRounders } from "@/lib/results";
import type { Gender } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");
    const view = searchParams.get("view") ?? "team"; // team | top8 | all-rounders
    const eventId = searchParams.get("eventId");
    const gender = searchParams.get("gender") as Gender | null;

    if (!performanceId) throw new ApiError(400, "performanceId is required");
    await requirePerformanceAccess(performanceId);

    if (view === "team") {
      if (!eventId) throw new ApiError(400, "eventId is required for team performance view");
      const data = await getTeamPerformance(performanceId, eventId);
      return NextResponse.json({ view, data });
    }

    if (view === "top8") {
      if (!eventId) throw new ApiError(400, "eventId is required for top 8 view");
      const data = await getTopN(performanceId, eventId, 8);
      return NextResponse.json({ view, data });
    }

    if (view === "all-rounders") {
      if (!gender) throw new ApiError(400, "gender is required for all-rounders view");
      const data = await getAllRounders(performanceId, gender);
      return NextResponse.json({ view, data });
    }

    throw new ApiError(400, "Unknown view");
  } catch (err) {
    return apiErrorResponse(err);
  }
}
