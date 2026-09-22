import { eq } from "drizzle-orm";

import type { AuthDb } from "@/lib/auth/provision-user";
import { provisionFreePlan } from "@/lib/auth/provision-user";
import { plans, users } from "@/db/schema";

export type AppUserRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
  storageUsedBytes: number;
  planSlug: string;
  planName: string;
  storageLimitBytes: number;
  maxUploadBytes: number;
  monthlyAnchorsIncluded: number;
};

async function fetchAppUser(db: AuthDb, clerkUserId: string) {
  const rows = await db
    .select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      storageUsedBytes: users.storageUsedBytes,
      planSlug: plans.slug,
      planName: plans.name,
      storageLimitBytes: plans.storageLimitBytes,
      maxUploadBytes: plans.maxUploadBytes,
      monthlyAnchorsIncluded: plans.monthlyAnchorsIncluded,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .innerJoin(plans, eq(plans.id, users.planId))
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
    storageUsedBytes: row.storageUsedBytes,
    planSlug: row.planSlug,
    planName: row.planName,
    storageLimitBytes: row.storageLimitBytes,
    maxUploadBytes: row.maxUploadBytes,
    monthlyAnchorsIncluded: row.monthlyAnchorsIncluded,
  } satisfies AppUserRow;
}

export async function resolveAppUser(
  db: AuthDb,
  clerkUserId: string,
  email: string | null,
): Promise<AppUserRow | null> {
  const existing = await fetchAppUser(db, clerkUserId);
  if (existing) {
    return existing;
  }

  const record = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (record?.deletedAt) {
    return null;
  }

  await provisionFreePlan(db, { clerkUserId, email });
  return fetchAppUser(db, clerkUserId);
}
