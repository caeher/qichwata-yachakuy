import { currentUser } from "@clerk/nextjs/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

export default async function SettingsPage() {
  const ctx = await loadDashboardUser();
  const clerkUser = await currentUser();

  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura Clerk y la base de datos para ver tu perfil.
        </p>
      </main>
    );
  }

  const name = [clerkUser?.firstName, clerkUser?.lastName]
    .filter(Boolean)
    .join(" ");

  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;
  const stellar = resolveStellarEndpoints();
  const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {name ? <p>Nombre: {name}</p> : null}
          <p>Correo: {email ?? "Sin correo"}</p>
          <p className="text-muted-foreground pt-2">
            La cuenta la gestiona Clerk. Si eliminas la cuenta en Clerk,
            redactamos el perfil y los nombres de registros históricos. Sus
            huellas y comprobantes en Stellar se conservan para verificación.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Integridad de certificados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Red configurada:{" "}
            {stellar.network === "mainnet"
              ? "Stellar Mainnet"
              : "Stellar Testnet"}
          </p>
          <p>
            Contrato Soroban:{" "}
            {contractId ? "Configurado" : "Pendiente de configuración"}
          </p>
          <p className="text-muted-foreground pt-2">
            La configuración de red no confirma un certificado. Su estado
            verificado requiere que el snapshot, el recibo y la consulta actual
            de Stellar coincidan. Los enlaces al explorador aparecen en el
            detalle únicamente cuando existe evidencia de transacción.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
