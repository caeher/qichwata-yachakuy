import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { releaseStorage } from "@/db/quota";
import { documents } from "@/db/schema";
import type { ObjectStorage } from "@/lib/storage/types";

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
  storage: ObjectStorage,
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

  try {
    await storage.delete(doc.storageKey);
  } catch (error) {
    console.error("storage_delete_failed", {
      storageKey: doc.storageKey,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
