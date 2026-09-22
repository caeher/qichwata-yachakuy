import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

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

  return children;
}
