import { desc, eq } from "drizzle-orm";

import {
  CertificateCard,
  CertificateDetails,
  VerificationStatus,
  type CertificateStatus,
} from "@/components/yachay/certificates";
import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { verifyCertificateByHash } from "@/lib/certificates/verify";
import { createChainLookup } from "@/lib/verify/chain";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

function presentationStatus(status: string): CertificateStatus {
  if (status === "anchored") return "anchored";
  if (status === "failed") return "failed";
  return "pending";
}

export default async function CertificatesPage() {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura la sesión y la base de datos para ver tus certificados.
        </p>
      </main>
    );
  }
  const db = getDb();
  const rows = await db.query.certificates.findMany({
    where: eq(certificates.userId, ctx.appUser.id),
    orderBy: [desc(certificates.createdAt)],
  });
  const endpoints = resolveStellarEndpoints();
  const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
  const chain = createChainLookup();
  const certificatesWithStatus = await Promise.all(
    rows.map(async (row) => {
      let status = presentationStatus(row.status);
      let verification: Awaited<
        ReturnType<typeof verifyCertificateByHash>
      > | null = null;
      if (row.status === "anchored") {
        try {
          verification = await verifyCertificateByHash(db, chain, row.sha256, {
            network: endpoints.network,
            contractId,
          });
          status =
            verification.status === "anchored"
              ? "anchored"
              : verification.status === "chain_unavailable"
                ? "unavailable"
                : verification.status === "integrity_mismatch"
                  ? "mismatch"
                  : verification.status === "failed"
                    ? "failed"
                    : verification.status === "pending"
                      ? "pending"
                      : "mismatch";
        } catch {
          status = "unavailable";
        }
      }
      return { row, status, verification };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Mis certificados
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cada certificado conserva la versión del curso y la huella de su
          snapshot de finalización.
        </p>
      </header>
      {rows.length === 0 ? (
        <section className="border-border bg-paper rounded-3xl border p-6">
          <h2 className="font-heading text-xl">Aún no tienes certificados</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            El avance de las unidades no emite un certificado por sí solo. Falta
            aprobar la política académica de evaluación y finalización para este
            curso.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4">
          {certificatesWithStatus.map(({ row, status, verification }) => {
            const snapshot = row.snapshot as {
              issuer?: string;
              course?: { title?: string; version?: string };
              completion?: { policyVersion?: string; completedAt?: string };
              issuedAt?: string;
            };
            return (
              <li key={row.id}>
                <CertificateCard
                  title={snapshot.course?.title ?? "Certificado"}
                  version={snapshot.course?.version}
                  status={status}
                  href={`/certificates/${row.publicId}`}
                >
                  <VerificationStatus status={status}>
                    {status === "anchored"
                      ? "Snapshot y recibo confirmados mediante consulta actual a Stellar."
                      : status === "unavailable"
                        ? "La red configurada no respondió; el recibo guardado no basta para confirmar el estado actual."
                        : status === "mismatch"
                          ? "La huella, el snapshot o la evidencia en cadena presentan una discrepancia."
                          : status === "failed"
                            ? "El intento de anclaje falló; el job puede recuperarlo."
                            : "La emisión está pendiente de anclaje."}
                  </VerificationStatus>
                  <CertificateDetails
                    evidence={{
                      issuer: snapshot.issuer,
                      publicId: row.publicId,
                      issuedAt:
                        snapshot.issuedAt ?? row.createdAt.toISOString(),
                      sha256: row.sha256,
                      networkLabel:
                        verification?.status === "anchored"
                          ? verification.network
                          : `Configurada: ${endpoints.network}`,
                      contractId,
                      txHash:
                        verification?.status === "anchored"
                          ? verification.txHash
                          : undefined,
                      ledger:
                        verification?.status === "anchored"
                          ? verification.ledger
                          : undefined,
                      expertUrl:
                        verification?.status === "anchored"
                          ? verification.expertUrl
                          : undefined,
                    }}
                  />
                  {snapshot.completion?.policyVersion ? (
                    <p className="text-muted-foreground text-xs">
                      Política de finalización:{" "}
                      {snapshot.completion.policyVersion}
                    </p>
                  ) : null}
                </CertificateCard>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
