"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DocumentDetail } from "@/lib/anchors/document-detail";

type Props = {
  detail: DocumentDetail;
};

export function DocumentAnchorPanel({ detail: initial }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollDetail = useCallback(async () => {
    const response = await fetch(`/api/documents/${detail.id}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as DocumentDetail;
  }, [detail.id]);

  async function handleAnchor() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${detail.id}/anchor`, {
        method: "POST",
      });
      const payload = await response.json();

      if (response.status === 503 && payload.error === "anchor_unconfigured") {
        setError("El anclaje no está configurado en el servidor.");
        return;
      }
      if (response.status === 409 && payload.error === "anchor_quota_exceeded") {
        setError("Has usado los 10 anclajes del plan Gratis este mes.");
        return;
      }
      if (
        response.status === 409 &&
        payload.error === "hash_already_anchored"
      ) {
        setError("Este contenido ya está anclado en otro registro.");
        return;
      }
      if (response.status === 422 && payload.error === "anchor_failed") {
        setError("El anclaje falló.");
        setDetail((d) => ({ ...d, status: "failed" }));
        return;
      }
      if (!response.ok) {
        setError("No se pudo anclar el documento.");
        return;
      }

      setDetail(payload as DocumentDetail);

      if (payload.status === "pending") {
        let attempts = 0;
        while (attempts < 15) {
          await new Promise((r) => setTimeout(r, 2000));
          const next = await pollDetail();
          if (!next) {
            break;
          }
          setDetail(next);
          if (next.status === "anchored" || next.status === "failed") {
            return;
          }
          attempts += 1;
        }
        setError(
          "Sigue pendiente. Puedes dejar esta página y volver al detalle.",
        );
      }
      router.refresh();
    } catch {
      setError("Error de red al anclar.");
    } finally {
      setLoading(false);
    }
  }

  const expert = detail.anchor?.expertUrl;

  return (
    <div className="flex flex-col gap-3">
      {detail.status === "draft" || detail.status === "failed" ? (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={loading}
          onClick={handleAnchor}
        >
          {detail.status === "failed"
            ? "Reintentar anclaje"
            : "Anclar en blockchain"}
        </Button>
      ) : null}
      {detail.status === "pending" ? (
        <Button type="button" disabled className="w-full sm:w-auto">
          Anclando en Stellar…
        </Button>
      ) : null}
      {detail.status === "anchored" && expert ? (
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          render={
            <a href={expert} target="_blank" rel="noreferrer">
              Ver en Stellar Expert
            </a>
          }
        />
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {error?.includes("otro registro") ? (
        <Link
          href={`/v/${detail.sha256}`}
          className="text-sm font-medium underline"
        >
          Verificar
        </Link>
      ) : null}
    </div>
  );
}
