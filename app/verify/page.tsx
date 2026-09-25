import { headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
import { VerifyForm } from "@/app/verify/verify-form";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyPage({ searchParams }: Props) {
  const query = await searchParams;
  const legacyIdentifier = Object.values(query)
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .find((value) => /^YCH-[A-Za-z0-9-]+$/i.test(value));
  const initialHash =
    Object.entries(query)
      .filter(([key]) =>
        ["hash", "sha256", "id", "identifier", "certificateId"].includes(key),
      )
      .flatMap(([, value]) =>
        Array.isArray(value) ? value : value ? [value] : [],
      )
      .find((value) => !/^YCH-/i.test(value)) ?? "";
  const h = await headers();
  const rate = checkVerifyRateLimit(clientIp(h));
  const configuredNetwork = resolveStellarEndpoints().network;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader title="Yachay · lengua viva" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <section className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Verificar un certificado
          </h1>
          <p className="text-muted-foreground text-sm">
            Comprueba si una huella SHA-256 tiene un comprobante histórico en
            PostgreSQL o Stellar. No hace falta una cuenta.
          </p>
          <p className="text-muted-foreground text-xs">
            Estos comprobantes provienen de anclajes históricos; no son
            certificados educativos.
          </p>
        </section>
        {legacyIdentifier ? (
          <div
            className="border-clay/30 bg-clay-pale text-clay-dark rounded-xl border p-4 text-sm"
            role="status"
          >
            <p className="font-semibold">Referencia heredada sin verificar</p>
            <p className="mt-2">
              {legacyIdentifier} proviene del sistema anterior. No hay evidencia
              de anclaje asociada y no se reconoce como certificado vigente.
            </p>
          </div>
        ) : null}
        {!rate.ok ? (
          <p className="text-destructive text-sm">
            Demasiadas comprobaciones. Espera un momento.
          </p>
        ) : (
          <VerifyForm
            initialHash={initialHash}
            configuredNetwork={configuredNetwork}
          />
        )}
      </main>
    </div>
  );
}
