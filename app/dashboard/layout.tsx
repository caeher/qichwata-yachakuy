import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardUserMenu } from "@/components/dashboard-user-menu";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.CLERK_SECRET_KEY) {
    return children;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdashboard");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        trailing={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Configuración
            </Link>
            <DashboardUserMenu />
          </div>
        }
        title="Yachay · lengua viva"
      />
      <DashboardNav />
      {children}
      <Toaster />
    </div>
  );
}
