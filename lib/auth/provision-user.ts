import { and, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { plans, subscriptions, users } from "@/db/schema";

export type AuthDb = Database | TestDatabase;
type Tx = Parameters<Parameters<AuthDb["transaction"]>[0]>[0];

function endOfUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

async function getFreePlanId(db: Tx) {
  const free = await db.query.plans.findFirst({
    where: eq(plans.slug, "free"),
  });
  if (!free) {
    throw new Error(
      "Plan Free no encontrado. Ejecuta pnpm db:migrate && pnpm db:seed.",
    );
  }
  return free.id;
}

export async function provisionFreePlanInner(
  tx: Tx,
  input: { clerkUserId: string; email: string | null },
): Promise<{ userId: string }> {
  const freePlanId = await getFreePlanId(tx);
  const periodEnd = endOfUtcMonth();

  const existing = await tx.query.users.findFirst({
    where: eq(users.clerkUserId, input.clerkUserId),
  });

  let userId: string;

  if (!existing) {
    const [created] = await tx
      .insert(users)
      .values({
        clerkUserId: input.clerkUserId,
        email: input.email,
        planId: freePlanId,
      })
      .returning();
    userId = created.id;
  } else if (existing.deletedAt) {
    const [restored] = await tx
      .update(users)
      .set({
        email: input.email,
        planId: freePlanId,
        deletedAt: null,
      })
      .where(eq(users.id, existing.id))
      .returning();
    userId = restored.id;
  } else {
    await tx
      .update(users)
      .set({ email: input.email })
      .where(eq(users.id, existing.id));
    userId = existing.id;
  }

  await tx
    .insert(subscriptions)
    .values({
      userId,
      planId: freePlanId,
      status: "active",
      currentPeriodEnd: periodEnd,
    })
    .onConflictDoNothing({ target: subscriptions.userId });

  return { userId };
}

export async function provisionFreePlan(
  db: AuthDb,
  input: { clerkUserId: string; email: string | null },
): Promise<{ userId: string }> {
  return db.transaction((tx) => provisionFreePlanInner(tx, input));
}

export async function markUserDeletedInner(tx: Tx, clerkUserId: string) {
  const user = await tx.query.users.findFirst({
    where: and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)),
  });
  if (!user) {
    return;
  }

  await tx
    .update(users)
    .set({ deletedAt: sql`now()` })
    .where(eq(users.id, user.id));

  await tx
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(eq(subscriptions.userId, user.id));
}

export async function markUserDeleted(db: AuthDb, clerkUserId: string) {
  await db.transaction((tx) => markUserDeletedInner(tx, clerkUserId));
}
