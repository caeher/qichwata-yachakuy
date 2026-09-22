import type { Metadata } from "next";
import { headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
import { VerifyForm } from "@/app/verify/verify-form";
import { getDb } from "@/db/client";
import { createChainLookup } from "@/lib/verify/chain";
import { normalizeHashHex } from "@/lib/verify/hash-input";
import { ChainUnavailableError, lookupWithClaim } from "@/lib/verify/lookup";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";

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
      }
    | { status: "not_found"; sha256: string };
}) {
  if (result.status === "not_found") {
    return (
      <p className="text-sm">No hay un ancla para este hash.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium">Anclado</p>
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
        <SiteHeader title="stellar-data-integrity" />
        <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
          <p className="text-destructive text-sm">Hash no válido.</p>
        </main>
      </div>
    );
  }

  let lookupResult:
    | Awaited<ReturnType<typeof lookupWithClaim>>
    | { error: "chain_unavailable" }
    | null = null;

  if (rate.ok && process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
      lookupResult = await lookupWithClaim(
        db,
        createChainLookup(),
        { sha256: normalized, claimedSha256: null },
        contractId,
      );
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
      <SiteHeader title="stellar-data-integrity" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
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
        {lookupResult &&
        !("error" in lookupResult) &&
        lookupResult.status !== "mismatch" ? (
          <ResultBlock result={lookupResult} />
        ) : null}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">
            Comprobar un archivo contra este hash
          </h2>
          <VerifyForm initialHash={normalized} />
        </section>
      </main>
    </div>
  );
}
