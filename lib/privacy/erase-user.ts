import { and, eq, sql } from "drizzle-orm";

import { auditEvents, documents, subscriptions, users } from "@/db/schema";
import type { AuthDb } from "@/lib/auth/provision-user";
import type { StorageProvider } from "@/lib/storage/types";
import { keyBelongsToUser } from "@/lib/uploads/storage-key";

export async function eraseUserAccount(
  db: AuthDb,
  storage: StorageProvider,
  clerkUserId: string,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!user) {
    return;
  }

  const docRows = await db
    .select({
      id: documents.id,
      storageKey: documents.storageKey,
      deletedAt: documents.deletedAt,
      sizeBytes: documents.sizeBytes,
    })
    .from(documents)
    .where(eq(documents.userId, user.id));

  await db.transaction(async (tx) => {
    if (!user.deletedAt) {
      await tx
        .update(users)
        .set({ deletedAt: sql`now()`, email: null })
        .where(eq(users.id, user.id));
    } else {
      await tx.update(users).set({ email: null }).where(eq(users.id, user.id));
    }

    await tx
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(eq(subscriptions.userId, user.id));

    for (const doc of docRows) {
      if (!doc.deletedAt) {
        await tx
          .update(documents)
          .set({ deletedAt: sql`now()` })
          .where(eq(documents.id, doc.id));
        await tx
          .update(users)
          .set({
            storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} - ${doc.sizeBytes})`,
          })
          .where(eq(users.id, user.id));
      }
    }

    await tx
      .update(documents)
      .set({ name: "deleted" })
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
  });

  for (const doc of docRows) {
    if (!keyBelongsToUser(doc.storageKey, user.id)) {
      continue;
    }
    try {
      await storage.delete(doc.storageKey);
    } catch (error) {
      console.error("storage_delete_failed", {
        storageKey: doc.storageKey,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
