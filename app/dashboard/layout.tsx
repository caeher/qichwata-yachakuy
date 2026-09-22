import { auth } from "@clerk/nextjs/server";
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
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        trailing={<DashboardUserMenu />}
        title="stellar-data-integrity"
      />
      <DashboardNav />
      {children}
      <Toaster />
    </div>
  );
}
