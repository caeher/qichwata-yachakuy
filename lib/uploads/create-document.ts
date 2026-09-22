import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthDb } from "@/lib/auth/provision-user";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { documents } from "@/db/schema";
import { reserveStorage, releaseStorage } from "@/db/quota";
import { sha256Hex } from "@/lib/uploads/hash";
import { assertAllowedUpload } from "@/lib/uploads/sniff";
import type { ObjectStorage } from "@/lib/storage/types";

export type DocumentDto = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "draft";
  createdAt: string;
};

export type CreateDraftInput = {
  clerkUserId: string;
  email: string | null;
  name: string;
  declaredMime: string;
  bytes: Uint8Array;
};

function storageKeyFor(userId: string, documentId: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${userId}/${yyyy}/${mm}/${documentId}`;
}

export async function createDraftDocument(
  db: AuthDb,
  storage: ObjectStorage,
  input: CreateDraftInput,
): Promise<DocumentDto> {
  const appUser = await resolveAppUser(db, input.clerkUserId, input.email);
  if (!appUser) {
    throw new Error("unauthorized");
  }

  if (input.bytes.byteLength > appUser.maxUploadBytes) {
    const { UploadTooLargeError } = await import("@/db/quota");
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

export async function listDocumentsForUser(db: AuthDb, userId: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));

  return rows.map((doc) => ({
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256,
    status: doc.status as "draft",
    createdAt: doc.createdAt.toISOString(),
  }));
}
