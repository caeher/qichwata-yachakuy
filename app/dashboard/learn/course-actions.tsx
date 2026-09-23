"use client";

import { useState } from "react";

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
        <button
          disabled={busy}
          onClick={enroll}
          className="bg-primary text-primary-foreground w-fit rounded-lg px-4 py-2 text-sm font-medium"
        >
          {busy ? "Guardando…" : "Inscribirme"}
        </button>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
              >
                <span>{unit.title}</span>
                {completedUnitIds.includes(unit.id) ? (
                  <span className="text-muted-foreground">Completada</span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => markUnit(unit.id)}
                    className="font-medium underline"
                  >
                    Marcar avance
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            disabled={busy}
            onClick={finalize}
            className="border-border w-fit rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Solicitar finalización
          </button>
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
