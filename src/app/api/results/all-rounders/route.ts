import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/api-auth";
import { genders, provinces, teams, normalizeEnumParam } from "@/lib/validators";
import { getAllRounderResults } from "@/lib/result-service";

/** All Rounders spans both performances (each event uses its own configured performance). */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const gender = normalizeEnumParam(searchParams.get("gender"), genders);
    const province = normalizeEnumParam(searchParams.get("province"), provinces);
    const team = normalizeEnumParam(searchParams.get("team"), teams);

    if (gender.invalid || province.invalid || team.invalid) {
      return NextResponse.json({ events: [], students: [] });
    }

    const results = await getAllRounderResults({
      gender: gender.value,
      province: province.value,
      team: team.value,
    });
    return NextResponse.json(results);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
