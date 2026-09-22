import { and, eq, isNull, sql } from "drizzle-orm";

import { countSuccessfulAnchorsThisMonth } from "@/db/anchor-quota";
import type { AuthDb } from "@/lib/auth/provision-user";
import { documents, plans, users } from "@/db/schema";

export type UsageSummary = {
  planSlug: string;
  planName: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  maxUploadBytes: number;
  anchorsIncluded: number;
  anchorsSettled: number;
  anchorsPending: number;
};

export async function countPendingAnchorsForUser(
  db: AuthDb,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.status, "pending"),
        isNull(documents.deletedAt),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function loadUsageSummary(
  db: AuthDb,
  userId: string,
  now: Date = new Date(),
): Promise<UsageSummary | null> {
  const rows = await db
    .select({
      planSlug: plans.slug,
      planName: plans.name,
      storageUsedBytes: users.storageUsedBytes,
      storageLimitBytes: plans.storageLimitBytes,
      maxUploadBytes: plans.maxUploadBytes,
      anchorsIncluded: plans.monthlyAnchorsIncluded,
    })
    .from(users)
    .innerJoin(plans, eq(plans.id, users.planId))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const anchorsSettled = await countSuccessfulAnchorsThisMonth(db, userId, now);
  const anchorsPending = await countPendingAnchorsForUser(db, userId);

  return {
    planSlug: row.planSlug,
    planName: row.planName,
    storageUsedBytes: row.storageUsedBytes,
    storageLimitBytes: row.storageLimitBytes,
    maxUploadBytes: row.maxUploadBytes,
    anchorsIncluded: row.anchorsIncluded,
    anchorsSettled,
    anchorsPending,
  };
}
