import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/api-auth";
import { getStorageDriver, assertValidImageUpload } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "No file provided");
    }

    assertValidImageUpload(file.type, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await getStorageDriver().save(buffer, file.name, file.type);

    return NextResponse.json({ url });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
