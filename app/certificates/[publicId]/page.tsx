import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  CertificateCard,
  CertificateDetails,
  VerificationStatus,
  type CertificateStatus,
} from "@/components/yachay/certificates";
import { legacyDb } from "@/lib/db/legacy-db";
import { convexConfigured } from "@/lib/convex/server";
import { getPublicCertificate, verifyCertificateByHash } from "@/lib/certificates/verify";
import { createChainLookup } from "@/lib/verify/chain";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";

type Props = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Certificado ${publicId.slice(0, 8)}` };
}

function statusFor(status: string): CertificateStatus {
  if (status === "anchored") return "anchored";
  if (status === "pending") return "pending";
  if (status === "failed") return "failed";
  if (status === "chain_unavailable") return "unavailable";
  if (status === "integrity_mismatch") return "mismatch";
  return "mismatch";
}

export default async function PublicCertificatePage({ params }: Props) {
  const { publicId } = await params;
  const requestHeaders = await headers();
  const rate = checkVerifyRateLimit(clientIp(requestHeaders));
  if (!rate.ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <VerificationStatus status="unavailable">
          Demasiadas comprobaciones. Espera un momento antes de volver a
          consultar.
        </VerificationStatus>
      </main>
    );
  }
  if (!convexConfigured() && !process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <VerificationStatus status="unavailable">
          La base de datos no está disponible para recuperar el certificado.
        </VerificationStatus>
      </main>
    );
  }
  const db = legacyDb();
  const loaded = await getPublicCertificate(db, publicId);
  if (!loaded) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-12 sm:px-6">
        <CertificateCard title="Certificado desconocido" status="unknown">
          <p>No existe un certificado raíz con este identificador público.</p>
          <p className="text-muted-foreground text-sm">
            Los identificadores heredados YCH se conservan como referencias sin
            evidencia y no se consideran certificados verificados.
          </p>
        </CertificateCard>
      </main>
    );
  }

  const cert = {
    publicId: loaded.publicId,
    sha256: loaded.sha256,
    snapshot:
      "issuer" in loaded
        ? {
            issuer: loaded.issuer,
            course: { title: loaded.courseTitle },
            issuedAt: loaded.issuedAt,
          }
        : {},
    createdAt: new Date(loaded.issuedAt ?? Date.now()),
    status: loaded.state,
  };

  const endpoints = resolveStellarEndpoints();
  const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
  let result;
  try {
    result = await verifyCertificateByHash(
      db,
      createChainLookup(),
      cert.sha256,
      { network: endpoints.network, contractId },
    );
  } catch {
    result = {
      status: "chain_unavailable" as const,
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  }
  const snapshot = cert.snapshot as {
    issuer?: string;
    course?: { title?: string; version?: string };
    completion?: { policyVersion?: string; completedAt?: string };
    issuedAt?: string;
  };
  const status = statusFor(result.status);
  const evidence = result.status === "anchored" ? result : null;
  const snapshotTrusted =
    result.status !== "integrity_mismatch" && result.status !== "unknown";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <CertificateCard
        title={
          snapshotTrusted
            ? (snapshot.course?.title ?? "Finalización educativa")
            : "Snapshot con discrepancia"
        }
        version={snapshotTrusted ? snapshot.course?.version : undefined}
        status={status}
      >
        <VerificationStatus status={status}>
          {status === "anchored"
            ? "Integridad del snapshot y transacción contrastadas con Stellar en esta consulta. No equivale a acreditación académica externa."
            : status === "pending"
              ? "La intención está guardada; aún no hay evidencia de anclaje confirmada."
              : status === "failed"
                ? "El intento de anclaje falló y está pendiente de recuperación."
                : status === "unavailable"
                  ? "La consulta de la red no está disponible. El certificado no se declara verificado."
                  : status === "unknown"
                    ? "No hay un certificado raíz asociado a esta referencia."
                    : "Los datos del snapshot, el hash o el recibo no coinciden."}
        </VerificationStatus>
        <CertificateDetails
          evidence={{
            issuer: snapshotTrusted ? snapshot.issuer : undefined,
            publicId: cert.publicId,
            issuedAt: snapshotTrusted
              ? (snapshot.issuedAt ?? cert.createdAt.toISOString())
              : undefined,
            sha256: cert.sha256,
            network: evidence?.network,
            networkLabel:
              evidence?.network ?? `Configurada: ${endpoints.network}`,
            contractId,
            txHash: evidence?.txHash,
            ledger: evidence?.ledger,
            expertUrl: evidence?.expertUrl,
          }}
        />
        {snapshotTrusted && snapshot.completion?.policyVersion ? (
          <p className="text-muted-foreground text-xs">
            Versión de política de finalización:{" "}
            {snapshot.completion.policyVersion}
          </p>
        ) : null}
      </CertificateCard>
      <p className="text-muted-foreground text-sm leading-6">
        El hash corresponde al snapshot canónico inmutable de finalización, no a
        un archivo PDF. La vista pública omite el nombre y la identidad privada
        del alumno.
      </p>
    </main>
  );
}
