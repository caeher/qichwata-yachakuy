import { auth, currentUser } from "@clerk/nextjs/server";

import { DashboardUserMenu } from "@/components/dashboard-user-menu";
import { SiteHeader } from "@/components/site-header";
import { UploadForm } from "@/app/dashboard/upload-form";
import { countSuccessfulAnchorsThisMonth } from "@/db/anchor-quota";
import { getDb } from "@/db/client";
import { FREE_MONTHLY_ANCHORS } from "@/db/constants";
import { formatBytes } from "@/lib/format-bytes";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";

export default async function DashboardPage() {
  if (!process.env.CLERK_SECRET_KEY) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <p className="text-muted-foreground text-sm">
            Configura las claves de Clerk en `.env.local` para usar el panel.
          </p>
        </main>
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;

  let usageLine =
    "Configura DATABASE_URL y ejecuta pnpm db:migrate && pnpm db:seed.";
  let anchorLine: string | null = null;
  let planLabel = "Gratis";

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const appUser = await resolveAppUser(db, userId, email);
      if (appUser) {
        planLabel = appUser.planSlug === "free" ? "Gratis" : appUser.planName;
        usageLine = `${formatBytes(appUser.storageUsedBytes)} de ${formatBytes(appUser.storageLimitBytes)}`;
        const usedAnchors = await countSuccessfulAnchorsThisMonth(
          db,
          appUser.id,
        );
        anchorLine = `Anclajes este mes: ${usedAnchors} de ${FREE_MONTHLY_ANCHORS}`;
      }
    } catch {
      usageLine =
        "No se pudo cargar el uso. Verifica DATABASE_URL y las migraciones.";
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        trailing={<DashboardUserMenu />}
        title="stellar-data-integrity"
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
          <p className="text-muted-foreground text-sm">
            Sesión de {email ?? userId}
          </p>
          <p className="text-sm">
            Plan {planLabel} · {usageLine}
            {anchorLine ? ` · ${anchorLine}` : null}
          </p>
        </section>
        <UploadForm />
      </main>
    </div>
  );
}
