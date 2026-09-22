import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { releaseStorage } from "@/db/quota";
import { documents } from "@/db/schema";
import { recordAudit } from "@/lib/audit/record";
import type { StorageProvider } from "@/lib/storage/types";
import { keyBelongsToUser } from "@/lib/uploads/storage-key";

type Db = Database | TestDatabase;

export class DocumentNotFoundForDeleteError extends Error {
  constructor() {
    super("not_found");
    this.name = "DocumentNotFoundForDeleteError";
  }
}

export class DocumentPendingDeleteError extends Error {
  constructor() {
    super("document_pending");
    this.name = "DocumentPendingDeleteError";
  }
}

export async function deleteDocumentForUser(
  db: Db,
  storage: StorageProvider,
  userId: string,
  documentId: string,
): Promise<void> {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.userId, userId),
      isNull(documents.deletedAt),
    ),
  });

  if (!doc) {
    throw new DocumentNotFoundForDeleteError();
  }

  if (doc.status === "pending") {
    throw new DocumentPendingDeleteError();
  }

  await releaseStorage(db, documentId);

  await recordAudit(db, {
    userId,
    action: "document_delete",
    documentId,
  });

  if (keyBelongsToUser(doc.storageKey, userId)) {
    try {
      await storage.delete(doc.storageKey);
    } catch (error) {
      console.error("storage_delete_failed", {
        storageKey: doc.storageKey,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  } else {
    console.error("storage_key_rejected", { documentId });
  }
}
