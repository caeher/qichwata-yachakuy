import { NextResponse } from "next/server";

import { legacyDb } from "@/lib/db/legacy-db";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { completeUnit, EducationError } from "@/lib/education/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ enrollmentId: string; unitId: string }> },
) {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { enrollmentId, unitId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { answers?: unknown }).answers) ||
    !(body as { answers: unknown[] }).answers.every(
      (answer) => typeof answer === "string",
    )
  )
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  try {
    const progress = await completeUnit(legacyDb(), {
      userId: ctx.appUser.id,
      enrollmentId,
      unitId,
      answers: (body as { answers: string[] }).answers,
    });
    return NextResponse.json({
      progressId:
        progress.progress &&
        ("id" in progress.progress
          ? progress.progress.id
          : "_id" in progress.progress
            ? (progress.progress as { _id: string })._id
            : null),
      completedAt:
        progress.progress &&
        ("completedAt" in progress.progress
          ? progress.progress.completedAt instanceof Date
            ? progress.progress.completedAt.toISOString()
            : new Date(
                progress.progress.completedAt as number,
              ).toISOString()
          : null),
      feedback: progress.feedback,
    });
  } catch (error) {
    if (error instanceof EducationError)
      return NextResponse.json(
        { error: error.code },
        {
          status:
            error.code === "not_found"
              ? 404
              : error.code === "evidence_required" ||
                  error.code === "evidence_incorrect"
                ? 422
                : 409,
        },
      );
    throw error;
  }
}
