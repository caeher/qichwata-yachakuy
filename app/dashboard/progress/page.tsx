import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActionLink,
  ModuleCard,
  SectionHeading,
  StatCard,
  StatusBadge,
  YachayProgress,
} from "@/components/yachay/components";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { loadLearningSummary } from "@/lib/dashboard/learning-summary";

export default async function ProgressPage() {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          {ctx.kind === "clerk_missing"
            ? "Configura las claves de Clerk en .env.local para ver tu progreso."
            : "Configura DATABASE_URL y ejecuta pnpm db:migrate."}
        </p>
      </main>
    );
  }

  const summary = await loadLearningSummary(ctx.appUser.id);
  const hasCourses = summary.courses.length > 0;
  const allComplete = hasCourses && summary.completedCourses === summary.courses.length;
  const certificatesAvailable = summary.courses.filter((course) =>
    course.certificate.startsWith("Certificado disponible") ||
    course.certificate === "Certificado verificado",
  ).length;
  const policyPending = summary.courses.some(
    (course) => course.certificate === "Política de certificado pendiente",
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <SectionHeading
        level="h1"
        size="compact"
        eyebrow="Yachay · Mi espacio"
        title={allComplete ? "Has completado tu recorrido" : "Tu camino toma forma"}
        description="El avance se calcula con las unidades válidas de tus inscripciones vigentes. Puedes volver a cualquier curso para continuar."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas de progreso">
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
            <CardTitle>Aún no hay cursos inscritos</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-col items-start gap-4 text-sm leading-6">
            <p>Elige un curso disponible para empezar a registrar tu avance. Las métricas aparecerán a medida que completes sus unidades.</p>
            <ActionLink href="/dashboard/learn">Explorar cursos</ActionLink>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card variant="learning" accent={allComplete ? "gold" : "leaf"}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {allComplete ? "Recorrido completado" : summary.completedUnits === 0 ? "Tu recorrido está listo" : "Sigue con tu próximo paso"}
                <StatusBadge tone={allComplete ? "success" : "pending"}>
                  {allComplete ? "Completado" : summary.completedUnits === 0 ? "Sin avance" : "En progreso"}
                </StatusBadge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              {summary.next ? (
                <>
                  <div className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{summary.next.title} · {summary.next.nextUnit.title}</span>
                      <span className="text-muted-foreground">{summary.next.progress}% del curso</span>
                    </div>
                    <div className="mt-3">
                      <YachayProgress
                        value={summary.next.progress}
                        label={`Progreso de ${summary.next.title}`}
                      />
                    </div>
                  </div>
                  <ActionLink href={`/dashboard/learn/${summary.next.courseId}?unitId=${summary.next.nextUnit.id}`}>
                    Ir a la siguiente unidad
                  </ActionLink>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3 text-sm">
                  <p className="text-muted-foreground">
                    {certificatesAvailable > 0
                      ? `${certificatesAvailable} certificado(s) de este recorrido ya están disponibles.`
                      : policyPending
                        ? "Completaste las unidades. La política de emisión de certificados sigue pendiente."
                        : "Completaste todas las unidades válidas de tus cursos inscritos."}
                  </p>
                  <ActionLink href={certificatesAvailable > 0 ? "/dashboard/certificates" : "/dashboard/learn"}>
                    {certificatesAvailable > 0 ? "Ver certificados" : "Revisar cursos"}
                  </ActionLink>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-4">
            <SectionHeading
              level="h2"
              size="compact"
              eyebrow="Desglose"
              title="Avance por curso"
              description="Los cursos y unidades se mantienen ligados a la versión en la que se creó cada inscripción."
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
                  <Card className="mt-2" variant="learning">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Certificado</span>
                      <StatusBadge
                        tone={course.certificate.startsWith("Certificado verificado") ? "success" : course.certificate.includes("pendiente") ? "pending" : "neutral"}
                      >
                        {course.certificate}
                      </StatusBadge>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            {certificatesAvailable > 0 ? (
              <p className="text-sm">
                <Link href="/dashboard/certificates" className="text-leaf-dark font-semibold underline underline-offset-4">
                  Revisar mis certificados
                </Link>
              </p>
            ) : null}
          </section>
        </>
      )}

      <p className="text-muted-foreground text-sm">
        Rachas y palabras vistas no se muestran porque aún no hay eventos ni reglas de cómputo definidos.
      </p>
    </main>
  );
}
