import { NextResponse } from "next/server";

import { legacyDb } from "@/lib/db/legacy-db";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { EducationError, finalizeEnrollment } from "@/lib/education/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
) {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { enrollmentId } = await context.params;
  try {
    const outcome = await finalizeEnrollment(legacyDb(), {
      userId: ctx.appUser.id,
      enrollmentId,
      issuer: process.env.CERTIFICATE_ISSUER?.trim() ?? "",
    });
    return NextResponse.json({
      completionId: outcome.completion!.id,
      certificateId: outcome.certificate?.publicId ?? null,
    });
  } catch (error) {
    if (error instanceof EducationError)
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "not_found" ? 404 : 409 },
      );
    throw error;
  }
}
