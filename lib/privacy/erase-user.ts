import { and, eq, sql } from "drizzle-orm";

import { auditEvents, documents, users } from "@/db/schema";
import type { AuthDb } from "@/lib/auth/provision-user";

type Tx = Parameters<Parameters<AuthDb["transaction"]>[0]>[0];

export async function eraseUserAccountInner(
  tx: Tx,
  clerkUserId: string,
): Promise<void> {
  const user = await tx.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!user) {
    return;
  }

  await tx
    .update(users)
    .set({ deletedAt: sql`coalesce(${users.deletedAt}, now())`, email: null })
    .where(eq(users.id, user.id));

  await tx
    .update(documents)
    .set({
      name: "deleted",
      deletedAt: sql`coalesce(${documents.deletedAt}, now())`,
    })
    .where(eq(documents.userId, user.id));

  const existingErasure = await tx.query.auditEvents.findFirst({
    where: and(
      eq(auditEvents.userId, user.id),
      eq(auditEvents.action, "account_erasure"),
    ),
  });
  if (!existingErasure) {
    await tx.insert(auditEvents).values({
      userId: user.id,
      action: "account_erasure",
      meta: {},
    });
  }
}

export async function eraseUserAccount(
  db: AuthDb,
  clerkUserId: string,
): Promise<void> {
  await db.transaction((tx) => eraseUserAccountInner(tx, clerkUserId));
}
