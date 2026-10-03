import { NextResponse } from "next/server";

import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { enrollInCourse, EducationError } from "@/lib/education/service";
import { legacyDb } from "@/lib/db/legacy-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { courseId?: unknown }).courseId !== "string"
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  try {
    const enrollment = await enrollInCourse(legacyDb(), {
      userId: ctx.appUser.id,
      courseId: (body as { courseId: string }).courseId,
    });
    return NextResponse.json(
      { enrollmentId: enrollment.id, status: enrollment.status },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EducationError)
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "course_unavailable" ? 404 : 409 },
      );
    throw error;
  }
}
