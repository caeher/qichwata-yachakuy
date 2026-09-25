import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading, StatCard, StatusBadge } from "@/components/yachay/components";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";

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
          Configura DATABASE_URL y ejecuta pnpm db:migrate.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <section>
        <SectionHeading level="h1" size="compact" eyebrow="Yachay · Mi espacio" title="Mi recorrido de aprendizaje" />
        <p className="text-muted-foreground text-sm">
          Sesión de {ctx.email ?? ctx.appUser.clerkUserId}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumen de aprendizaje">
        <StatCard label="Cursos" value="Por definir" />
        <StatCard label="Lecciones" value="Por definir" surface="leaf" />
        <StatCard label="Certificados" value="Por definir" surface="ink" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card variant="learning" accent="leaf">
          <CardHeader>
            <CardTitle>Aprendizaje</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            El contenido educativo estará disponible próximamente.
          </CardContent>
        </Card>
        <Card variant="learning" accent="gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Certificados <StatusBadge tone="pending">En preparación</StatusBadge></CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Aquí aparecerán tus certificados verificables.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
