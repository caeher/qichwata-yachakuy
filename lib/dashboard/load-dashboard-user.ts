import { auth, currentUser } from "@clerk/nextjs/server";

import { getDb } from "@/db/client";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import type { AppUserRow } from "@/lib/auth/resolve-app-user";

export type DashboardUserContext =
  | { kind: "clerk_missing" }
  | { kind: "database_missing" }
  | { kind: "ready"; appUser: AppUserRow; email: string | null };

export async function loadDashboardUser(): Promise<DashboardUserContext> {
  if (!process.env.CLERK_SECRET_KEY) {
    return { kind: "clerk_missing" };
  }

  const { userId } = await auth();
  if (!userId) {
    return { kind: "clerk_missing" };
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;

  if (!process.env.DATABASE_URL) {
    return { kind: "database_missing" };
  }

  const db = getDb();
  const appUser = await resolveAppUser(db, userId, email);
  if (!appUser) {
    return { kind: "database_missing" };
  }

  return { kind: "ready", appUser, email };
}
