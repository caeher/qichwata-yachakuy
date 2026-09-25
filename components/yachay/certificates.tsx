import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/yachay/components";

export type CertificateStatus =
  | "preview"
  | "pending"
  | "anchored"
  | "failed"
  | "unavailable"
  | "unknown"
  | "mismatch";

const statusPresentation: Record<
  CertificateStatus,
  {
    label: string;
    tone: "neutral" | "success" | "pending" | "error";
    detail: string;
  }
> = {
  preview: {
    label: "Vista previa",
    tone: "neutral",
    detail: "Muestra de presentación; no acredita finalización ni anclaje.",
  },
  pending: {
    label: "Anclaje pendiente",
    tone: "pending",
    detail: "La intención de certificado está guardada y espera el anclaje.",
  },
  anchored: {
    label: "Verificado en red",
    tone: "success",
    detail:
      "El snapshot y el recibo coinciden con la evidencia consultada en Stellar.",
  },
  failed: {
    label: "Anclaje fallido",
    tone: "error",
    detail: "El intento de anclaje falló y puede requerir recuperación.",
  },
  unavailable: {
    label: "Verificación no disponible",
    tone: "pending",
    detail: "No fue posible consultar Stellar; el estado no se confirma ahora.",
  },
  unknown: {
    label: "No encontrado",
    tone: "neutral",
    detail: "No hay un certificado raíz asociado a este identificador o hash.",
  },
  mismatch: {
    label: "Discrepancia de integridad",
    tone: "error",
    detail: "El snapshot, el recibo o la evidencia de red no coinciden.",
  },
};

export function VerificationStatus({
  status,
  children,
}: {
  status: CertificateStatus;
  children?: ReactNode;
}) {
  const presentation = statusPresentation[status];
  return (
    <div
      className="flex flex-col items-start gap-2"
      role="status"
      aria-live="polite"
    >
      <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
      <p className="text-muted-foreground text-sm leading-6">
        {children ?? presentation.detail}
      </p>
    </div>
  );
}

export function CertificateCard({
  title,
  version,
  status,
  href,
  children,
}: {
  title: string;
  version?: string;
  status: CertificateStatus;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Card variant="learning" accent={status === "anchored" ? "leaf" : "clay"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground mb-1 text-xs tracking-[0.14em] uppercase">
              Certificado de aprendizaje
            </p>
            <CardTitle className="font-heading text-xl">{title}</CardTitle>
            {version ? (
              <p className="text-muted-foreground mt-1 text-sm">
                Versión {version}
              </p>
            ) : null}
          </div>
          <StatusBadge tone={statusPresentation[status].tone}>
            {statusPresentation[status].label}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {children}
        {href ? (
          <Link
            className="text-leaf-dark font-semibold underline underline-offset-4"
            href={href}
          >
            Abrir detalle del certificado
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export type CertificateEvidence = {
  issuer?: string | null;
  publicId?: string | null;
  issuedAt?: string | null;
  sha256?: string | null;
  network?: string | null;
  networkLabel?: string | null;
  contractId?: string | null;
  txHash?: string | null;
  ledger?: number | null;
  expertUrl?: string | null;
};

export function CertificateDetails({
  evidence,
}: {
  evidence: CertificateEvidence;
}) {
  const values: Array<[string, ReactNode]> = [
    ["Emisor", evidence.issuer],
    ["Identificador público", evidence.publicId],
    ["Emitido", evidence.issuedAt],
    ["SHA-256 del snapshot canónico", evidence.sha256],
    ["Red", evidence.networkLabel ?? evidence.network],
    ["Contrato", evidence.contractId],
    ["Transacción", evidence.txHash],
    ["Ledger", evidence.ledger],
  ];
  const visible = values.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  return (
    <>
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-[max-content_minmax(0,1fr)]">
        {visible.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {evidence.expertUrl ? (
        <a
          href={evidence.expertUrl}
          target="_blank"
          rel="noreferrer"
          className="text-leaf-dark font-semibold underline underline-offset-4"
        >
          Ver transacción en Stellar Expert
        </a>
      ) : null}
    </>
  );
}
