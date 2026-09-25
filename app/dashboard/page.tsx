import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActionLink,
  ModuleCard,
  SectionHeading,
  StatCard,
  StatusBadge,
} from "@/components/yachay/components";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { loadLearningSummary } from "@/lib/dashboard/learning-summary";

export default async function DashboardPage() {
  const ctx = await loadDashboardUser();

  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          {ctx.kind === "clerk_missing"
            ? "Configura las claves de Clerk en .env.local para usar el panel."
            : "Configura DATABASE_URL y ejecuta pnpm db:migrate."}
        </p>
      </main>
    );
  }

  const summary = await loadLearningSummary(ctx.appUser.id);
  const hasCourses = summary.courses.length > 0;
  const allComplete = hasCourses && summary.completedCourses === summary.courses.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <SectionHeading
            level="h1"
            size="compact"
            eyebrow="Yachay · Mi espacio"
            title="Allin p’unchay"
            description="Tu aprendizaje crece con cada unidad que completas. Aquí puedes retomar el curso y ver el recorrido de tus inscripciones."
          />
        </div>
        <Card variant="learning" accent="leaf" className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-leaf-dark uppercase">
                Continuar aprendiendo
              </p>
              {summary.next ? (
                <>
                  <h2 className="mt-2 font-heading text-xl">{summary.next.nextUnit.title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{summary.next.title}</p>
                </>
              ) : (
                <h2 className="mt-2 font-heading text-xl">
                  {hasCourses ? "Recorrido completado" : "Elige tu primer curso"}
                </h2>
              )}
            </div>
            {hasCourses ? (
              <StatusBadge tone={summary.next ? "pending" : "success"}>
                {summary.next ? `${summary.next.progress}%` : "Completado"}
              </StatusBadge>
            ) : null}
          </div>
          <div className="mt-4">
            {summary.next ? (
              <ActionLink href={`/dashboard/learn/${summary.next.courseId}?unitId=${summary.next.nextUnit.id}`} size="sm">
                Ir a la siguiente unidad
              </ActionLink>
            ) : allComplete ? (
              <ActionLink href="/dashboard/certificates" size="sm">
                Revisar certificados
              </ActionLink>
            ) : (
              <ActionLink href="/dashboard/learn" size="sm">
                Explorar cursos
              </ActionLink>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de aprendizaje">
        <StatCard label="Avance total" value={`${summary.progress}%`} surface="leaf" />
        <StatCard
          label="Unidades completadas"
          value={`${summary.completedUnits}/${summary.totalUnits}`}
        />
        <StatCard
          label="Cursos completados"
          value={`${summary.completedCourses}/${summary.courses.length}`}
          surface="ink"
        />
        <StatCard label="Certificados" value={summary.certificateCount} />
      </section>

      {!hasCourses ? (
        <Card variant="learning" accent="gold">
          <CardHeader>
            <CardTitle>Tu recorrido empieza con un curso</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-col items-start gap-4 text-sm leading-6">
            <p>Inscríbete en un curso disponible para guardar unidades completadas y ver aquí tu avance real.</p>
            <ActionLink href="/dashboard/learn">Elegir un curso</ActionLink>
          </CardContent>
        </Card>
      ) : (
        <section className="flex flex-col gap-4">
          <SectionHeading
            level="h2"
            size="compact"
            eyebrow="Tu mapa"
            title="Cursos de tu recorrido"
            description="Cada porcentaje usa las unidades válidas de la versión en la que estás inscrito."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {summary.courses.map((course) => (
              <li key={course.enrollmentId}>
                <ModuleCard
                  title={course.title}
                  description={course.description}
                  href={`/dashboard/learn/${course.courseId}`}
                  accent={course.accent}
                  status={course.status}
                  statusLabel={`v${course.version} · ${course.status === "completed" ? "Completado" : course.status === "in-progress" ? "En curso" : "Sin avance"}`}
                  unitCount={course.unitCount}
                  progress={course.progress}
                />
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            Las rachas y las palabras vistas todavía no tienen eventos de cómputo definidos.
          </p>
          <Link href="/dashboard/progress" className="text-leaf-dark text-sm font-semibold underline underline-offset-4">
            Ver desglose de progreso
          </Link>
        </section>
      )}
    </main>
  );
}
