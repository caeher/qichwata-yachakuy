import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { DashboardUserMenu } from "@/components/dashboard-user-menu";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadDocumentDetail } from "@/lib/anchors/document-detail";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { DocumentAnchorPanel } from "@/app/dashboard/document-anchor-panel";

type Props = { params: Promise<{ id: string }> };

const statusLabel: Record<string, string> = {
  draft: "Borrador. Aún no está anclado en Stellar.",
  pending: "Anclando en Stellar…",
  anchored: "Anclado en Stellar.",
  failed: "El anclaje falló.",
};

export default async function DocumentDetailPage({ params }: Props) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.DATABASE_URL) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;

  const { id } = await params;
  const db = getDb();
  const appUser = await resolveAppUser(db, userId, email);
  if (!appUser) {
    notFound();
  }

  const detail = await loadDocumentDetail(db, appUser.id, id);
  if (!detail) {
    notFound();
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        trailing={<DashboardUserMenu />}
        title="stellar-data-integrity"
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-fit"
            render={<Link href="/dashboard" />}
          >
            Volver al panel
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {statusLabel[detail.status] ?? detail.status}
          </p>
        </div>
        <code className="bg-muted block rounded-md p-3 text-xs break-all">
          {detail.sha256}
        </code>
        <DocumentAnchorPanel detail={detail} />
      </main>
    </div>
  );
}
