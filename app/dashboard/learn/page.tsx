import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleCard } from "@/components/yachay/components";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { INITIAL_COURSES } from "@/lib/education/initial-catalog";
import { isCourseEligibleForEnrollment } from "@/lib/education/content";
import { api, convexConfigured, convexQuery } from "@/lib/convex/server";
import { getClerkConvexToken } from "@/lib/convex/clerk-token";

export default async function LearnPage() {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground text-sm">
          Configura la sesión y la base de datos para aprender.
        </p>
      </main>
    );

  let visibleCatalog: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    accent: string;
    level: string;
    version: string;
    demo: boolean;
    estimatedDurationMinutes: number;
    status: string;
    enrollmentEnabled: boolean;
  }>;
  let units: Array<{ courseId: string; content: unknown }>;

  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    const catalog = await convexQuery(api.education.listCatalog, {}, token);
    visibleCatalog = catalog.courses.map((course) => ({
      ...course,
      id: course._id,
    }));
    units = catalog.units.map((unit) => ({
      courseId: unit.courseId,
      content: unit.content,
    }));
  } else {
    const db = getDb();
    const catalog = await db.query.courses.findMany({
      orderBy: [asc(courses.createdAt)],
    });
    visibleCatalog = catalog.filter((course) => course.status !== "archived");
    units = await db.query.courseUnits.findMany();
  }

  const initialOrder = new Map(
    INITIAL_COURSES.map((course, index) => [course.slug, index]),
  );
  visibleCatalog.sort(
    (left, right) =>
      (initialOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
      (initialOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
  );
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Aprendizaje
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Catálogo inicial en preparación. Cada curso y versión muestra su
          estado de publicación.
        </p>
      </header>
      {visibleCatalog.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Catálogo vacío</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Todavía no hay cursos en el catálogo.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visibleCatalog.map((course) => (
            <li key={course.id}>
              <ModuleCard
                title={course.title}
                description={course.description}
                href={`/dashboard/learn/${course.id}`}
                accent={course.accent as "leaf" | "clay" | "gold"}
                status={
                  course.demo
                    ? "demo"
                    : isCourseEligibleForEnrollment({
                          course,
                          contents: units
                            .filter((unit) => unit.courseId === course.id)
                            .map((unit) => unit.content),
                        })
                      ? "available"
                      : "preparation"
                }
                level={course.level === "beginner" ? "Inicial" : course.level}
                durationMinutes={course.estimatedDurationMinutes}
                unitCount={
                  units.filter((unit) => unit.courseId === course.id).length
                }
                statusLabel={
                  course.demo
                    ? `Demostración · v${course.version}`
                    : isCourseEligibleForEnrollment({
                          course,
                          contents: units
                            .filter((unit) => unit.courseId === course.id)
                            .map((unit) => unit.content),
                        })
                      ? `Disponible · v${course.version}`
                      : `En preparación · v${course.version}`
                }
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        <Link href="/dashboard/certificates" className="font-medium underline">
          Ver mis certificados
        </Link>
      </p>
    </main>
  );
}
