import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <h1 className="text-2xl font-semibold tracking-tight">Mi espacio</h1>
        <p className="text-muted-foreground text-sm">
          Sesión de {ctx.email ?? ctx.appUser.clerkUserId}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aprendizaje</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            El contenido educativo estará disponible próximamente.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Certificados</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Aquí aparecerán tus certificados verificables.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
