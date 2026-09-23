import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { completeUnit, EducationError } from "@/lib/education/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ enrollmentId: string; unitId: string }> },
) {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { enrollmentId, unitId } = await context.params;
  try {
    const progress = await completeUnit(getDb(), {
      userId: ctx.appUser.id,
      enrollmentId,
      unitId,
    });
    return NextResponse.json({
      progressId: progress?.id ?? null,
      completedAt: progress?.completedAt ?? null,
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
