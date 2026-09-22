import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthDb } from "@/lib/auth/provision-user";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { documents } from "@/db/schema";
import {
  reserveStorage,
  releaseStorage,
  UploadTooLargeError,
} from "@/db/quota";
import { sha256Hex } from "@/lib/uploads/hash";
import { assertAllowedUpload } from "@/lib/uploads/sniff";
import type { StorageProvider } from "@/lib/storage/types";
import { storageKeyFor } from "@/lib/uploads/storage-key";

export type DocumentDto = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "draft" | "pending" | "anchored" | "failed";
  createdAt: string;
};

export type CreateDraftInput = {
  clerkUserId: string;
  email: string | null;
  name: string;
  declaredMime: string;
  bytes: Uint8Array;
};

export async function createDraftDocument(
  db: AuthDb,
  storage: StorageProvider,
  input: CreateDraftInput,
): Promise<DocumentDto> {
  const appUser = await resolveAppUser(db, input.clerkUserId, input.email);
  if (!appUser) {
    throw new Error("unauthorized");
  }

  if (input.bytes.byteLength > appUser.maxUploadBytes) {
    throw new UploadTooLargeError(appUser.maxUploadBytes);
  }

  const safeName = input.name.trim().slice(0, 255);
  if (!safeName || input.bytes.byteLength === 0) {
    throw new Error("invalid_input");
  }

  const mimeType = assertAllowedUpload(
    input.bytes,
    safeName,
    input.declaredMime,
  );
  const sha256 = sha256Hex(input.bytes);
  const documentId = crypto.randomUUID();
  const storageKey = storageKeyFor(appUser.id, documentId);

  await reserveStorage(db, {
    userId: appUser.id,
    name: safeName,
    mimeType,
    sizeBytes: input.bytes.byteLength,
    sha256,
    storageKey,
    documentId,
  });

  try {
    await storage.put(storageKey, input.bytes, mimeType);
  } catch {
    await releaseStorage(db, documentId);
    throw new Error("storage_failed");
  }

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  if (!doc) {
    throw new Error("document_missing");
  }

  return {
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256,
    status: "draft",
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listDocumentsForUser(
  db: AuthDb,
  userId: string,
  limit = 100,
) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))
    .limit(limit);

  return rows.map((doc) => ({
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256,
    status: doc.status as DocumentDto["status"],
    createdAt: doc.createdAt.toISOString(),
  }));
}
