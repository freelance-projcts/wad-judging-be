import { NextRequest, NextResponse } from "next/server";
import { requireSession, requirePerformanceAccess, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getResultsForExport, toCsv } from "@/lib/results";
import { provinceLabels } from "@/lib/validators";
import type { Gender, Province } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");
    const eventId = searchParams.get("eventId");
    const gender = searchParams.get("gender") as Gender | null;

    if (!performanceId || !gender) {
      throw new ApiError(400, "performanceId and gender are required");
    }
    await requirePerformanceAccess(performanceId);

    const entries = await getResultsForExport(performanceId, gender, eventId ?? undefined);

    const rows = entries.map((e) => ({
      StudentID: e.student.code,
      Name: e.student.fullName,
      Province: provinceLabels[e.student.province as Province],
      Team: e.student.team ?? "",
      Event: e.event.name,
      Round: e.round,
      D: e.dScore.toString(),
      E1: e.e1Score.toString(),
      E2: e.e2Score.toString(),
      E3: e.e3Score.toString(),
      E4: e.e4Score.toString(),
      Penalty: e.penaltyScore.toString(),
      Final: e.finalScore.toString(),
    }));

    const csv = toCsv(rows);
    const eventName = entries[0]?.event.name ?? "results";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${eventName}-${gender}-results.csv"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
