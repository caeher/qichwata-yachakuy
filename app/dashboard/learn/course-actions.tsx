"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LessonRow } from "@/components/yachay/components";

export function CourseActions({
  courseId,
  enrollmentId,
  units,
  completedUnitIds,
}: {
  courseId: string;
  enrollmentId: string | null;
  units: Array<{ id: string; title: string }>;
  completedUnitIds: string[];
}) {
  const [activeEnrollment, setActiveEnrollment] = useState(enrollmentId);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enroll() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/education/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo inscribir.");
      setActiveEnrollment(body.enrollmentId);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function markUnit(unitId: string) {
    if (!activeEnrollment) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/education/enrollments/${activeEnrollment}/units/${unitId}`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No se pudo guardar el avance.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!activeEnrollment) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/education/enrollments/${activeEnrollment}/complete`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error === "criteria_pending"
            ? "Los criterios académicos siguen pendientes; no se emitió un certificado."
            : (body.error ?? "No se pudo finalizar."),
        );
      setMessage("Finalización registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!activeEnrollment ? (
        <Button variant="primary" loading={busy} onClick={enroll} className="w-fit">
          Inscribirme
        </Button>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {units.map((unit) => (
              <li key={unit.id}>
                <LessonRow
                  title={unit.title}
                  status={completedUnitIds.includes(unit.id) ? "completed" : "pending"}
                  actionLabel={completedUnitIds.includes(unit.id) ? undefined : "Marcar avance"}
                  onAction={() => markUnit(unit.id)}
                  disabled={busy}
                />
              </li>
            ))}
          </ul>
          <Button variant="outline" disabled={busy} onClick={finalize} className="w-fit">
            Solicitar finalización
          </Button>
        </>
      )}
      {message ? (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
