import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { courseUnits, courses, enrollments, unitProgress } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import {
  isCourseEligibleForEnrollment,
  isCourseUnitContent,
} from "@/lib/education/content";
import { CourseActions } from "@/app/dashboard/learn/course-actions";

function LessonContent({ content }: { content: unknown }) {
  if (!isCourseUnitContent(content)) {
    return (
      <p className="text-muted-foreground text-sm">
        Contenido pendiente de estructurar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {content.kind === "vocabulary"
            ? "Vocabulario"
            : content.kind === "phrases"
              ? "Frases"
              : "Actividad"}
        </Badge>
        <Badge variant="outline">
          {content.status === "published"
            ? "Publicado · revisión registrada"
            : "Borrador · revisión pendiente"}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {content.durationMinutes} min
        </span>
      </div>
      <section>
        <h3 className="font-medium">Objetivos</h3>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
          {content.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-medium">Lectura</h3>
        <div className="text-muted-foreground mt-2 space-y-2 text-sm leading-6">
          {content.reading.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
      {content.vocabulary.length > 0 ? (
        <section>
          <h3 className="font-medium">Vocabulario candidato</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {content.vocabulary.map((item) => (
              <li key={item.term}>
                <strong>{item.term}</strong>
                <span className="text-muted-foreground"> — {item.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {content.phrases.length > 0 ? (
        <section>
          <h3 className="font-medium">Frases candidatas</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {content.phrases.map((phrase) => (
              <li key={phrase.text}>
                <strong>{phrase.text}</strong>
                <span className="text-muted-foreground">
                  {" "}
                  — {phrase.translation} ({phrase.context})
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {content.examples.length > 0 ? (
        <section>
          <h3 className="font-medium">Ejemplo guiado</h3>
          {content.examples.map((example) => (
            <div
              key={example.prompt}
              className="text-muted-foreground mt-2 space-y-1 text-sm"
            >
              <p>
                <strong>Pregunta:</strong> {example.prompt}
              </p>
              <p>
                <strong>Respuesta propuesta:</strong> {example.response}
              </p>
              <p>{example.explanation}</p>
            </div>
          ))}
        </section>
      ) : null}
      <section className="bg-muted/60 rounded-xl p-4">
        <h3 className="font-medium">{content.activity.title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          {content.activity.instructions[0]}
        </p>
        {content.activity.modality === "text" &&
        content.source.lessonId === "practica-02" ? (
          <p className="mt-2 text-sm font-medium">
            Actividad textual; no incluye audio.
          </p>
        ) : null}
        <p className="text-muted-foreground mt-3 text-sm">
          {content.activity.items.length} actividad(es) textual(es). Las
          soluciones se muestran después de responder.
        </p>
      </section>
      <div className="border-t pt-4 text-xs">
        <p>
          Fuentes:{" "}
          {content.sources.status === "pending"
            ? "pendientes"
            : `${content.sources.items.length} documentadas`}
          . Variedad: {content.regionalVariant.name ?? "por definir"}.
        </p>
        <p className="text-muted-foreground mt-1">
          No es material validado ni certificable.
        </p>
      </div>
    </div>
  );
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ unitId?: string | string[] }>;
}) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  const requestedUnitId = Array.isArray(query.unitId)
    ? query.unitId[0]
    : query.unitId;
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
    where: eq(courses.id, courseId),
  });
  if (!course || course.status === "archived")
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Curso no disponible</h1>
      </main>
    );

  const units = await db.query.courseUnits.findMany({
    where: eq(courseUnits.courseId, course.id),
    orderBy: [asc(courseUnits.position)],
  });
  const canEnroll = isCourseEligibleForEnrollment({
    course,
    contents: units.map((unit) => unit.content),
  });
  const enrollment = canEnroll
    ? await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.courseId, course.id),
          eq(enrollments.userId, ctx.appUser.id),
          eq(enrollments.courseVersion, course.version),
        ),
      })
    : undefined;
  const progress = enrollment
    ? await db.query.unitProgress.findMany({
        where: eq(unitProgress.enrollmentId, enrollment.id),
      })
    : [];
  const statusLabel = course.demo
    ? "Demostración"
    : canEnroll
      ? "Disponible"
      : "En preparación";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Link
        href="/dashboard/learn"
        className="text-muted-foreground text-sm underline"
      >
        Volver a aprendizaje
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.title}
          </h1>
          <Badge variant="outline">
            {statusLabel} · v{course.version}
          </Badge>
          {course.demo ? (
            <Badge variant="secondary">No certificable</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {course.description}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Nivel inicial · {course.estimatedDurationMinutes} min · Política de
          finalización {course.completionPolicyVersion}:{" "}
          {course.completionPolicyStatus === "approved"
            ? "aprobada"
            : "pendiente"}
        </p>
      </header>
      {canEnroll ? (
        <CourseActions
          courseId={course.id}
          enrollmentId={enrollment?.id ?? null}
          ownerKey={ctx.appUser.id}
          tutorEnabled={Boolean(
            process.env.OPENAI_COACH_ENABLED === "true" &&
            process.env.OPENAI_API_KEY?.trim() &&
            process.env.OPENAI_MODEL?.trim(),
          )}
          requestedUnitId={requestedUnitId ?? null}
          units={units.flatMap((unit) => {
            if (!isCourseUnitContent(unit.content)) return [];
            const { activity, ...content } = unit.content;
            return [
              {
                id: unit.id,
                position: unit.position,
                title: unit.title,
                content: {
                  ...content,
                  activity: {
                    ...activity,
                    items: activity.items.map(({ prompt, options }) => ({
                      prompt,
                      options,
                    })),
                  },
                },
              },
            ];
          })}
          completedUnitIds={progress.map(({ unitId }) => unitId)}
          completionPolicyStatus={course.completionPolicyStatus}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {course.demo
                ? "Material de demostración"
                : "Contenido en preparación"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {course.demo
              ? "Esta muestra permite explorar el formato; no habilita inscripción, evaluación ni certificado."
              : "La inscripción se habilitará después de completar fuentes, autoría, revisión humana, variedad lingüística y criterios académicos para esta versión."}
          </CardContent>
        </Card>
      )}
      {!canEnroll
        ? units.map((unit) => (
            <Card key={unit.id}>
              <CardHeader>
                <CardTitle>
                  {unit.position}. {unit.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LessonContent content={unit.content} />
              </CardContent>
            </Card>
          ))
        : null}
      <p className="text-muted-foreground text-xs">
        La finalización y emisión de certificados siguen bloqueadas mientras la
        política académica esté pendiente.
      </p>
    </main>
  );
}
