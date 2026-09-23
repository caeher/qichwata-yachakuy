import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";

import { getDb } from "@/db/client";
import { courseUnits, courses, enrollments, unitProgress } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { CourseActions } from "@/app/dashboard/learn/course-actions";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm">
          Configura la sesión y la base de datos para continuar.
        </p>
      </main>
    );
  const db = getDb();
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.status, "published")),
  });
  if (!course || course.demo)
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Curso no disponible</h1>
      </main>
    );
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.courseId, course.id),
      eq(enrollments.userId, ctx.appUser.id),
      eq(enrollments.courseVersion, course.version),
    ),
  });
  const units = await db.query.courseUnits.findMany({
    where: eq(courseUnits.courseId, course.id),
    orderBy: [asc(courseUnits.position)],
  });
  const progress = enrollment
    ? await db.query.unitProgress.findMany({
        where: eq(unitProgress.enrollmentId, enrollment.id),
      })
    : [];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Link
        href="/dashboard/learn"
        className="text-muted-foreground text-sm underline"
      >
        Volver a aprendizaje
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {course.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {course.description}
        </p>
      </header>
      <CourseActions
        courseId={course.id}
        enrollmentId={enrollment?.id ?? null}
        units={units.map(({ id, title }) => ({ id, title }))}
        completedUnitIds={progress.map(({ unitId }) => unitId)}
      />
      <p className="text-muted-foreground text-xs">
        La finalización depende de criterios académicos que aún están pendientes
        de aprobación.
      </p>
    </main>
  );
}
