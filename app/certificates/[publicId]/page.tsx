import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { verifyCertificateByHash } from "@/lib/certificates/verify";
import { createChainLookup } from "@/lib/verify/chain";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";

type Props = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Certificado ${publicId.slice(0, 8)}` };
}

export default async function PublicCertificatePage({ params }: Props) {
  const { publicId } = await params;
  const requestHeaders = await headers();
  const rate = checkVerifyRateLimit(clientIp(requestHeaders));
  if (!rate.ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-destructive text-sm">
          Demasiadas comprobaciones. Espera un momento.
        </p>
      </main>
    );
  }
  if (!process.env.DATABASE_URL)
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p>Verificación no disponible.</p>
      </main>
    );
  const db = getDb();
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.publicId, publicId),
  });
  if (!cert)
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Certificado desconocido</h1>
      </main>
    );
  const endpoints = resolveStellarEndpoints();
  let result;
  try {
    result = await verifyCertificateByHash(
      db,
      createChainLookup(),
      cert.sha256,
      {
        network: endpoints.network,
        contractId: process.env.STELLAR_CONTRACT_ID?.trim() || null,
      },
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
    course?: { title?: string };
    issuedAt?: string;
  };
  const status =
    result.status === "anchored"
      ? "Confirmado en Stellar"
      : result.status === "pending"
        ? "Emisión pendiente"
        : result.status === "failed"
          ? "Emisión fallida; requiere recuperación"
          : result.status === "chain_unavailable"
            ? "No se pudo consultar Stellar"
            : "Los datos no coinciden con el hash emitido";
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        Certificado educativo
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        {snapshot.course?.title ?? "Finalización educativa"}
      </h1>
      <p className="text-muted-foreground">
        Emisor: {snapshot.issuer ?? "Pendiente"}
      </p>
      <p>
        Estado de verificación: <strong>{status}</strong>
      </p>
      <dl className="grid gap-2 text-sm">
        <dt className="text-muted-foreground">Identificador público</dt>
        <dd className="font-mono break-all">{cert.publicId}</dd>
        <dt className="text-muted-foreground">Emitido</dt>
        <dd>{snapshot.issuedAt ?? cert.createdAt.toISOString()}</dd>
        <dt className="text-muted-foreground">SHA-256 del payload canónico</dt>
        <dd className="font-mono break-all">{cert.sha256}</dd>
      </dl>
      {result.status === "anchored" && result.expertUrl ? (
        <a
          href={result.expertUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          Ver transacción en Stellar Expert
        </a>
      ) : null}
      <p className="text-muted-foreground text-sm">
        La comprobación confirma integridad del payload y registro del emisor en
        la red indicada. No representa acreditación académica externa. El hash
        corresponde a los datos canónicos versionados, no a un archivo PDF.
      </p>
    </main>
  );
}
