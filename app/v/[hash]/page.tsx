import type { Metadata } from "next";
import { headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
import { VerifyForm } from "@/app/verify/verify-form";
import { legacyDb } from "@/lib/db/legacy-db";
import { convexConfigured } from "@/lib/convex/server";
import { createChainLookup } from "@/lib/verify/chain";
import { normalizeHashHex } from "@/lib/verify/hash-input";
import { ChainUnavailableError, lookupAnchor } from "@/lib/verify/lookup";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";
import { verifyCertificateByHash } from "@/lib/certificates/verify";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

type Props = { params: Promise<{ hash: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  const short = hash.length >= 8 ? `${hash.slice(0, 8)}…` : hash;
  return { title: `Verificación ${short}` };
}

function ResultBlock({
  result,
}: {
  result:
    | {
        status: "anchored";
        sha256: string;
        network: string;
        txHash: string | null;
        ledger: number | null;
        anchoredAt: string | null;
        expertUrl: string | null;
        onChain: boolean | null;
        source: string;
      }
    | { status: "not_found"; sha256: string };
}) {
  if (result.status === "not_found") {
    return <p className="text-sm">No hay un ancla para este hash.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium">
        {result.onChain === true
          ? "Confirmado actualmente en Stellar"
          : result.onChain === false
            ? "El hash no aparece actualmente en Stellar"
            : "Recibo local; estado actual de Stellar desconocido"}
      </p>
      <code className="bg-muted block rounded-md p-3 text-xs break-all">
        {result.sha256}
      </code>
      <p className="text-muted-foreground">Red: {result.network}</p>
      {result.txHash ? <p className="break-all">Tx: {result.txHash}</p> : null}
      {result.expertUrl ? (
        <a
          href={result.expertUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          Ver en Stellar Expert
        </a>
      ) : null}
    </div>
  );
}

export default async function VerifyHashPage({ params }: Props) {
  const h = await headers();
  const rate = checkVerifyRateLimit(clientIp(h));
  const { hash: rawHash } = await params;

  let normalized: string;
  try {
    normalized = normalizeHashHex(rawHash);
  } catch {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader title="Yachay · lengua viva" />
        <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
          <p className="text-destructive text-sm">Hash no válido.</p>
        </main>
      </div>
    );
  }

  let lookupResult:
    | Awaited<ReturnType<typeof lookupAnchor>>
    | { error: "chain_unavailable" }
    | null = null;
  let certificateResult: Awaited<
    ReturnType<typeof verifyCertificateByHash>
  > | null = null;

  if (rate.ok && (convexConfigured() || process.env.DATABASE_URL)) {
    try {
      const db = convexConfigured() ? (null as never) : legacyDb();
      const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
      lookupResult = await lookupAnchor(
        db,
        createChainLookup(),
        normalized,
        contractId,
      );
      if (lookupResult.status === "not_found") {
        const certificate = await verifyCertificateByHash(
          db,
          createChainLookup(),
          normalized,
          {
            network: resolveStellarEndpoints().network,
            contractId,
          },
        );
        if (certificate.status !== "unknown") certificateResult = certificate;
      }
    } catch (error) {
      if (error instanceof ChainUnavailableError) {
        lookupResult = { error: "chain_unavailable" };
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader title="Yachay · lengua viva" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-xs">
          Verificación de comprobante o certificado por SHA-256.
        </p>
        {!rate.ok ? (
          <p className="text-destructive text-sm">
            Demasiadas comprobaciones. Espera un momento.
          </p>
        ) : null}
        {lookupResult && "error" in lookupResult ? (
          <p className="text-destructive text-sm">
            No se pudo consultar la cadena. Inténtalo más tarde.
          </p>
        ) : null}
        {lookupResult && !("error" in lookupResult) ? (
          <ResultBlock result={lookupResult} />
        ) : null}
        {certificateResult ? (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              {certificateResult.status === "anchored"
                ? "Certificado confirmado en Stellar"
                : certificateResult.status === "pending"
                  ? "Certificado pendiente de anclaje"
                  : certificateResult.status === "failed"
                    ? "Anclaje fallido; recuperación pendiente"
                    : certificateResult.status === "chain_unavailable"
                      ? "Stellar no disponible para verificación actual"
                      : "Discrepancia de integridad"}
            </p>
            <code className="bg-muted block rounded-md p-3 text-xs break-all">
              {certificateResult.sha256}
            </code>
            {certificateResult.status === "anchored" &&
            certificateResult.expertUrl ? (
              <a
                href={certificateResult.expertUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Ver en Stellar Expert
              </a>
            ) : null}
          </div>
        ) : null}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Consultar otro hash</h2>
          <VerifyForm initialHash={normalized} />
        </section>
      </main>
    </div>
  );
}
