"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TutorPanel } from "@/components/coach/tutor-panel";
import type { CourseUnitContent } from "@/lib/education/content";

type SafeUnitContent = Omit<CourseUnitContent, "activity"> & {
  activity: Omit<CourseUnitContent["activity"], "items"> & {
    items: Array<
      Pick<CourseUnitContent["activity"]["items"][number], "prompt" | "options">
    >;
  };
};

type LearningUnit = {
  id: string;
  position: number;
  title: string;
  content: SafeUnitContent;
};

export function CourseActions({
  courseId,
  enrollmentId,
  ownerKey,
  units,
  completedUnitIds,
  completionPolicyStatus,
  requestedUnitId,
  tutorEnabled,
}: {
  courseId: string;
  enrollmentId: string | null;
  ownerKey: string;
  tutorEnabled: boolean;
  units: LearningUnit[];
  completedUnitIds: string[];
  completionPolicyStatus: string;
  requestedUnitId: string | null;
}) {
  const router = useRouter();
  const [activeEnrollment, setActiveEnrollment] = useState(enrollmentId);
  const [completed, setCompleted] = useState(() => new Set(completedUnitIds));
  const firstPending = units.find(
    (unit) => !completedUnitIds.includes(unit.id),
  );
  const requestedPending = units.find(
    (unit) =>
      unit.id === requestedUnitId && !completedUnitIds.includes(unit.id),
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const activeUnitId =
    selectedUnitId ??
    requestedPending?.id ??
    firstPending?.id ??
    units[0]?.id ??
    "";
  const [answers, setAnswers] = useState<string[]>([]);
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const activeUnit = units.find((unit) => unit.id === activeUnitId);
  const allComplete = units.length > 0 && completed.size === units.length;
  const answerFields = useMemo(
    () => activeUnit?.content.activity.items.map(() => "") ?? [],
    [activeUnit],
  );

  async function enroll() {
    setEnrolling(true);
    setError(null);
    try {
      const response = await fetch("/api/education/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo inscribir.");
      setActiveEnrollment(body.enrollmentId);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de red.");
    } finally {
      setEnrolling(false);
    }
  }

  async function submitActivity() {
    if (!activeEnrollment || !activeUnit || completed.has(activeUnit.id))
      return;
    setSavingUnitId(activeUnit.id);
    setError(null);
    setNotice(null);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/education/enrollments/${activeEnrollment}/units/${activeUnit.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "evidence_incorrect") {
          setFeedback("Revisa la respuesta y vuelve a intentarlo.");
          return;
        }
        if (body.error === "unauthorized")
          throw new Error(
            "Tu sesión venció. Inicia sesión y vuelve a intentar.",
          );
        throw new Error(body.error ?? "No se pudo guardar el avance.");
      }

      const nextCompleted = new Set(completed).add(activeUnit.id);
      setCompleted(nextCompleted);
      const serverFeedback = Array.isArray(body.feedback)
        ? body.feedback
            .filter((item: unknown): item is string => typeof item === "string")
            .join(" ")
        : "";
      setFeedback(
        [
          "Respuesta correcta. La unidad quedó guardada en tu cuenta.",
          serverFeedback,
        ]
          .filter(Boolean)
          .join(" "),
      );
      const next = units.find((unit) => !nextCompleted.has(unit.id));
      if (next) {
        setNotice(`Siguiente paso: ${next.title}.`);
      } else {
        setNotice(
          completionPolicyStatus === "approved"
            ? "Terminaste todas las unidades. La evaluación del módulo está pendiente."
            : "Terminaste todas las unidades. El módulo quedó completado como progreso; la evaluación para certificado sigue pendiente.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de red.");
    } finally {
      setSavingUnitId(null);
    }
  }

  async function requestCompletion() {
    if (!activeEnrollment || !allComplete) return;
    setFinalizing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/education/enrollments/${activeEnrollment}/complete`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "criteria_pending") {
          setNotice(
            "La evaluación académica y los criterios de certificación siguen pendientes de aprobación.",
          );
          return;
        }
        throw new Error(body.error ?? "No se pudo validar la finalización.");
      }
      setCertificateId(
        typeof body.certificateId === "string" ? body.certificateId : null,
      );
      setNotice("La finalización elegible se validó en el servidor.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de red.");
    } finally {
      setFinalizing(false);
    }
  }

  function selectUnit(unitId: string) {
    setSelectedUnitId(unitId);
    setAnswers([]);
    setError(null);
    setNotice(null);
    setFeedback(null);
  }

  if (!activeEnrollment) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Button
          variant="primary"
          loading={enrolling}
          onClick={enroll}
          className="w-fit"
        >
          Inscribirme
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      aria-label="Recorrido del módulo"
      className="grid gap-5 md:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.6fr)]"
    >
      <nav aria-label="Unidades del módulo">
        <h2 className="font-heading mb-3 text-xl">Unidades</h2>
        <ol className="flex flex-col gap-2">
          {units.map((unit) => {
            const isComplete = completed.has(unit.id);
            const isCurrent = unit.id === activeUnitId;
            return (
              <li key={unit.id}>
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => selectUnit(unit.id)}
                  className={`focus-visible:outline-leaf w-full rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isCurrent ? "border-leaf bg-leaf/10" : "border-border bg-card hover:bg-muted"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {unit.position}. {unit.title}
                    </span>
                    <Badge variant={isComplete ? "secondary" : "outline"}>
                      {isComplete ? "Guardada" : "Pendiente"}
                    </Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {allComplete ? (
          <div className="bg-muted mt-4 flex flex-col gap-3 rounded-xl p-3 text-sm">
            <p role="status">
              Todas las unidades están guardadas. La emisión requiere evaluación
              elegible validada en servidor.
            </p>
            {completionPolicyStatus === "approved" ? (
              <Button
                type="button"
                variant="outline"
                loading={finalizing}
                disabled={finalizing}
                onClick={() => void requestCompletion()}
              >
                Solicitar validación de finalización
              </Button>
            ) : (
              <p className="text-muted-foreground">
                Requisito pendiente: falta aprobar la política académica de
                evaluación y finalización.
              </p>
            )}
            {certificateId ? (
              <a
                className="font-medium underline"
                href={`/certificates/${certificateId}`}
              >
                Consultar certificado emitido
              </a>
            ) : null}
            {notice ? <p role="status">{notice}</p> : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </nav>

      {activeUnit ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {kindLabel(activeUnit.content.kind)}
              </Badge>
              <Badge variant="outline">
                {activeUnit.content.durationMinutes} min
              </Badge>
              {completed.has(activeUnit.id) ? (
                <Badge variant="secondary">Avance guardado</Badge>
              ) : null}
            </div>
            <CardTitle>
              {activeUnit.position}. {activeUnit.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <section>
              <h3 className="font-medium">Objetivos</h3>
              <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                {activeUnit.content.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="font-medium">
                {activeUnit.content.reading.title}
              </h3>
              <div className="text-muted-foreground mt-2 space-y-2 text-sm leading-6">
                {activeUnit.content.reading.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
            {activeUnit.content.vocabulary.length > 0 ? (
              <section>
                <h3 className="font-medium">Vocabulario candidato</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {activeUnit.content.vocabulary.map((item) => (
                    <li key={item.term}>
                      <strong>{item.term}</strong>
                      <span className="text-muted-foreground">
                        {" "}
                        — {item.meaning}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {activeUnit.content.phrases.length > 0 ? (
              <section>
                <h3 className="font-medium">Frases candidatas</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {activeUnit.content.phrases.map((phrase) => (
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
            {activeUnit.content.examples.length > 0 ? (
              <section>
                <h3 className="font-medium">Ejemplo guiado</h3>
                {activeUnit.content.examples.map((example) => (
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
            <form
              className="bg-muted/60 rounded-2xl p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitActivity();
              }}
            >
              <h3 className="font-medium">
                {activeUnit.content.activity.title}
              </h3>
              {activeUnit.content.activity.instructions.map((instruction) => (
                <p
                  key={instruction}
                  className="text-muted-foreground mt-2 text-sm"
                >
                  {instruction}
                </p>
              ))}
              <div className="mt-4 flex flex-col gap-4">
                {activeUnit.content.activity.items.map((item, index) => (
                  <label
                    key={`${activeUnit.id}-${index}`}
                    className="flex flex-col gap-2 text-sm font-medium"
                  >
                    {item.prompt}
                    <textarea
                      required
                      rows={3}
                      value={answers[index] ?? answerFields[index] ?? ""}
                      onChange={(event) =>
                        setAnswers((previous) => {
                          const next = [
                            ...(previous.length ? previous : answerFields),
                          ];
                          next[index] = event.target.value;
                          return next;
                        })
                      }
                      disabled={
                        completed.has(activeUnit.id) ||
                        savingUnitId === activeUnit.id
                      }
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 rounded-xl border px-3 py-2 font-normal outline-none focus-visible:ring-3 disabled:opacity-60"
                    />
                  </label>
                ))}
              </div>
              {activeUnit.content.activity.modality === "text" &&
              activeUnit.content.source.lessonId === "practica-02" ? (
                <p className="mt-3 text-sm font-medium">
                  Actividad textual; no incluye audio.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingUnitId === activeUnit.id}
                  disabled={completed.has(activeUnit.id)}
                >
                  {completed.has(activeUnit.id)
                    ? "Avance guardado"
                    : "Revisar y guardar avance"}
                </Button>
                {savingUnitId === activeUnit.id ? (
                  <span role="status" className="text-muted-foreground text-sm">
                    Guardando…
                  </span>
                ) : null}
              </div>
              {feedback ? (
                <p role="status" className="mt-3 text-sm">
                  {feedback}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="text-destructive mt-3 text-sm">
                  {error} Puedes corregir la respuesta o reintentar el guardado.
                </p>
              ) : null}
              {notice ? (
                <p role="status" className="mt-3 text-sm">
                  {notice}
                </p>
              ) : null}
            </form>
            {activeEnrollment ? (
              <TutorPanel
                key={`${ownerKey}:${activeEnrollment}:${activeUnit.id}`}
                enrollmentId={activeEnrollment}
                unitId={activeUnit.id}
                unitTitle={activeUnit.title}
                ownerKey={ownerKey}
                enabled={tutorEnabled}
              />
            ) : null}
            <footer className="border-t pt-4 text-xs">
              <p>
                Fuentes:{" "}
                {activeUnit.content.sources.status === "pending"
                  ? "pendientes"
                  : activeUnit.content.sources.items
                      .map((source) => source.citation)
                      .join("; ")}
                . Variedad:{" "}
                {activeUnit.content.regionalVariant.name ?? "por definir"}.
              </p>
              <p className="text-muted-foreground mt-1">
                Contenido en revisión. La práctica formativa no es evidencia de
                elegibilidad para certificado.
              </p>
            </footer>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function kindLabel(kind: CourseUnitContent["kind"]) {
  return kind === "vocabulary"
    ? "Vocabulario"
    : kind === "phrases"
      ? "Frases"
      : "Práctica";
}
