import { eq } from "drizzle-orm";

import type { AuthDb } from "@/lib/auth/provision-user";
import { provisionUser } from "@/lib/auth/provision-user";
import { users } from "@/db/schema";
import { api, convexConfigured, convexMutation } from "@/lib/convex/server";
import { getClerkConvexToken } from "@/lib/convex/clerk-token";

export type AppUserRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
};

async function fetchAppUser(db: AuthDb, clerkUserId: string) {
  const rows = await db
    .select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  const row = rows[0];
  if (!row || row.deletedAt) {
    return null;
  }

  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
  } satisfies AppUserRow;
}

export async function resolveAppUser(
  db: AuthDb,
  clerkUserId: string,
  email: string | null,
): Promise<AppUserRow | null> {
  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    return await convexMutation(
      api.users.resolveAppUser,
      { clerkUserId, email },
      token,
    );
  }

  await provisionUser(db, { clerkUserId, email });
  return fetchAppUser(db, clerkUserId);
}
