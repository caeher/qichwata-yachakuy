import { headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
import { VerifyForm } from "@/app/verify/verify-form";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";

export default async function VerifyPage() {
  const h = await headers();
  const rate = checkVerifyRateLimit(clientIp(h));

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader title="stellar-data-integrity" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Consultar un SHA-256
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
        {!rate.ok ? (
          <p className="text-destructive text-sm">
            Demasiadas comprobaciones. Espera un momento.
          </p>
        ) : (
          <VerifyForm />
        )}
      </main>
    </div>
  );
}
