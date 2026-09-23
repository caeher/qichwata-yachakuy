import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { users } from "@/db/schema";

export type AuthDb = Database | TestDatabase;
type Tx = Parameters<Parameters<AuthDb["transaction"]>[0]>[0];

export async function provisionUserInner(
  tx: Tx,
  input: { clerkUserId: string; email: string | null },
): Promise<{ userId: string }> {
  const [created] = await tx
    .insert(users)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  if (created) {
    return { userId: created.id };
  }

  const existing = await tx.query.users.findFirst({
    where: eq(users.clerkUserId, input.clerkUserId),
  });
  if (!existing) {
    throw new Error("user_provision_failed");
  }

  if (!existing.deletedAt) {
    await tx
      .update(users)
      .set({ email: input.email })
      .where(and(eq(users.id, existing.id), isNull(users.deletedAt)));
  }

  return { userId: existing.id };
}

export async function provisionUser(
  db: AuthDb,
  input: { clerkUserId: string; email: string | null },
): Promise<{ userId: string }> {
  return db.transaction((tx) => provisionUserInner(tx, input));
}

export async function markUserDeletedInner(tx: Tx, clerkUserId: string) {
  await tx
    .update(users)
    .set({ deletedAt: new Date(), email: null })
    .where(and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)));
}

export async function markUserDeleted(db: AuthDb, clerkUserId: string) {
  await db.transaction((tx) => markUserDeletedInner(tx, clerkUserId));
}
