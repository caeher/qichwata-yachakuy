import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { StatusBadge } from "@/components/yachay/components";

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
  const rows = await getDb().query.certificates.findMany({
    where: eq(certificates.userId, ctx.appUser.id),
    orderBy: [desc(certificates.createdAt)],
  });
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Mis certificados
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cada certificado verifica la integridad de un snapshot de
          finalización.
        </p>
      </header>
      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no tienes certificados</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            La oferta educativa y sus criterios de finalización están pendientes
            de aprobación.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => {
            const snapshot = row.snapshot as {
              course?: { title?: string };
              issuedAt?: string;
            };
            return (
              <li key={row.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {snapshot.course?.title ?? "Certificado"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      Estado:
                      <StatusBadge tone={row.status === "anchored" ? "success" : row.status === "failed" ? "error" : "pending"}>
                        {row.status === "anchored"
                          ? "Anclaje registrado"
                          : row.status === "failed"
                            ? "Falló; se puede recuperar"
                            : "Pendiente"}
                      </StatusBadge>
                    </p>
                    <p className="text-muted-foreground">
                      Emisión:{" "}
                      {snapshot.issuedAt ?? row.createdAt.toISOString()}
                    </p>
                    <Link
                      className="font-medium underline"
                      href={`/certificates/${row.publicId}`}
                    >
                      Ver certificado
                    </Link>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
