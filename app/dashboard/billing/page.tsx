import { QuotaProgress } from "@/components/quota-progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db/client";
import { isBillingEnabled } from "@/lib/billing/flags";
import { loadUsageSummary } from "@/lib/billing/usage";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { formatBytes } from "@/lib/format-bytes";

export default async function BillingPage() {
  const ctx = await loadDashboardUser();

  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura Clerk y la base de datos para ver tu plan.
        </p>
      </main>
    );
  }

  const db = getDb();
  const usage = await loadUsageSummary(db, ctx.appUser.id);
  const billingOn = isBillingEnabled();
  const anchorsUsed =
    (usage?.anchorsSettled ?? 0) + (usage?.anchorsPending ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>

      {usage ? (
        <Card>
          <CardHeader>
            <CardTitle>{usage.planName}</CardTitle>
            <CardDescription>Plan actual</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <QuotaProgress
              label="Almacenamiento"
              used={usage.storageUsedBytes}
              limit={usage.storageLimitBytes}
            />
            <QuotaProgress
              label="Anclajes este mes"
              used={anchorsUsed}
              limit={usage.anchorsIncluded}
              caption={
                usage.anchorsPending > 0
                  ? `${usage.anchorsPending} en curso`
                  : undefined
              }
            />
            <p className="text-sm">
              Tamaño máximo por archivo:{" "}
              <span className="font-medium">
                {formatBytes(usage.maxUploadBytes)}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">
              Los anclajes se reinician al inicio del mes UTC.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled>
                Mejorar plan
              </Button>
              <Button type="button" variant="outline" disabled>
                Comprar anclajes
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              El cobro está desactivado. No se realiza ningún cargo.
              {billingOn ? " Los pagos todavía no están conectados." : null}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
