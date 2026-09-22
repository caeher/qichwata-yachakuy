import { and, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { documents, plans, usageEvents, users } from "@/db/schema";

type QuotaDb = Database | TestDatabase;

export class UploadTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super("file_too_large");
    this.name = "UploadTooLargeError";
    this.maxBytes = maxBytes;
  }
}

export class QuotaExceededError extends Error {
  readonly limitBytes: number;
  readonly usedBytes: number;

  constructor(limitBytes: number, usedBytes: number) {
    super("quota_exceeded");
    this.name = "QuotaExceededError";
    this.limitBytes = limitBytes;
    this.usedBytes = usedBytes;
  }
}

export type ReserveStorageInput = {
  userId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  documentId?: string;
};

export async function reserveStorage(db: QuotaDb, input: ReserveStorageInput) {
  const documentId = input.documentId ?? crypto.randomUUID();

  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        storageUsedBytes: users.storageUsedBytes,
        storageLimitBytes: plans.storageLimitBytes,
        maxUploadBytes: plans.maxUploadBytes,
      })
      .from(users)
      .innerJoin(plans, eq(plans.id, users.planId))
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .for("update");

    const row = locked[0];
    if (!row) {
      throw new Error("user_not_found");
    }

    if (input.sizeBytes > row.maxUploadBytes) {
      throw new UploadTooLargeError(row.maxUploadBytes);
    }
    if (row.storageUsedBytes + input.sizeBytes > row.storageLimitBytes) {
      throw new QuotaExceededError(row.storageLimitBytes, row.storageUsedBytes);
    }

    await tx.insert(documents).values({
      id: documentId,
      userId: input.userId,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      storageKey: input.storageKey,
      status: "draft",
    });

    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`${users.storageUsedBytes} + ${input.sizeBytes}`,
      })
      .where(eq(users.id, input.userId));

    await tx.insert(usageEvents).values({
      userId: input.userId,
      type: "upload",
      bytesDelta: input.sizeBytes,
      meta: { documentId, sha256: input.sha256 },
    });

    return { documentId };
  });
}

export async function releaseStorage(db: QuotaDb, documentId: string) {
  await db.transaction(async (tx) => {
    const doc = await tx
      .select({
        id: documents.id,
        userId: documents.userId,
        sizeBytes: documents.sizeBytes,
        deletedAt: documents.deletedAt,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .for("update");

    const row = doc[0];
    if (!row || row.deletedAt) {
      return;
    }

    await tx
      .update(documents)
      .set({ deletedAt: sql`now()` })
      .where(eq(documents.id, documentId));

    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} - ${row.sizeBytes})`,
      })
      .where(eq(users.id, row.userId));
  });
}
