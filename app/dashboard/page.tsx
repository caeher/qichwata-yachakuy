import Link from "next/link";

import { DocumentStatusBadge } from "@/components/document-status-badge";
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
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { loadUsageSummary } from "@/lib/billing/usage";
import { listDocumentsForUser } from "@/lib/uploads/create-document";

function formatDocDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    dateStyle: "medium",
  });
}

export default async function DashboardPage() {
  const ctx = await loadDashboardUser();

  if (ctx.kind === "clerk_missing") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura las claves de Clerk en `.env.local` para usar el panel.
        </p>
      </main>
    );
  }

  if (ctx.kind === "database_missing") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura DATABASE_URL y ejecuta pnpm db:migrate && pnpm db:seed.
        </p>
      </main>
    );
  }

  const db = getDb();
  const usage = await loadUsageSummary(db, ctx.appUser.id);
  const recent = await listDocumentsForUser(db, ctx.appUser.id, 5);

  const anchorsUsed =
    (usage?.anchorsSettled ?? 0) + (usage?.anchorsPending ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
          <p className="text-muted-foreground text-sm">
            Sesión de {ctx.email ?? ctx.appUser.clerkUserId}
          </p>
        </div>
        <Button render={<Link href="/dashboard/documents/new" />}>
          Nuevo documento
        </Button>
      </section>

      {usage ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Almacenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <QuotaProgress
                label="Almacenamiento"
                used={usage.storageUsedBytes}
                limit={usage.storageLimitBytes}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Anclajes este mes</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>{usage.planName}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/dashboard/billing" />}
              >
                Ver facturación
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Documentos recientes</h2>
        {recent.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Todavía no hay documentos.
            </p>
            <Button render={<Link href="/dashboard/documents/new" />}>
              Nuevo documento
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((doc) => (
              <li
                key={doc.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <Link
                  href={`/dashboard/documents/${doc.id}`}
                  className="font-medium hover:underline"
                >
                  {doc.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <DocumentStatusBadge status={doc.status} />
                  <span className="text-muted-foreground text-xs">
                    {formatDocDate(doc.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
