import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { anchors, documents, users } from "@/db/schema";
import {
  deleteDocumentForUser,
  DocumentNotFoundForDeleteError,
  DocumentPendingDeleteError,
} from "@/lib/uploads/delete-document";
import { provisionFreePlan } from "@/lib/auth/provision-user";
import { createMemoryStorage } from "@/lib/storage/memory";

describe("deleteDocumentForUser", () => {
  async function setup() {
    const { db } = await createTestDb();
    await seedPlans(db);
    const { userId } = await provisionFreePlan(db, {
      clerkUserId: "del_user",
      email: "d@example.com",
    });
    const other = await provisionFreePlan(db, {
      clerkUserId: "other",
      email: "o@example.com",
    });
    return { db, userId, otherUserId: other.userId };
  }

  it("soft-deletes draft and releases storage bytes", async () => {
    const { db, userId } = await setup();
    const storage = createMemoryStorage();
    const sha = "d".repeat(64);
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        name: "x.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        sha256: sha,
        storageKey: "k1",
        status: "draft",
      })
      .returning();
    await db
      .update(users)
      .set({ storageUsedBytes: 100 })
      .where(eq(users.id, userId));
    await storage.put("k1", new Uint8Array([1]), "text/plain");
    const del = vi.spyOn(storage, "delete");

    await deleteDocumentForUser(db, storage, userId, doc.id);

    expect(del).toHaveBeenCalledWith("k1");
    const row = await db.query.documents.findFirst({
      where: eq(documents.id, doc.id),
    });
    expect(row?.deletedAt).not.toBeNull();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.storageUsedBytes).toBe(0);
  });

  it("returns not found for other user", async () => {
    const { db, userId, otherUserId } = await setup();
    const storage = createMemoryStorage();
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        name: "x.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
        sha256: "e".repeat(64),
        storageKey: "k2",
        status: "draft",
      })
      .returning();

    await expect(
      deleteDocumentForUser(db, storage, otherUserId, doc.id),
    ).rejects.toBeInstanceOf(DocumentNotFoundForDeleteError);
  });

  it("blocks delete while pending", async () => {
    const { db, userId } = await setup();
    const storage = createMemoryStorage();
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        name: "p.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
        sha256: "f".repeat(64),
        storageKey: "k3",
        status: "pending",
      })
      .returning();

    await expect(
      deleteDocumentForUser(db, storage, userId, doc.id),
    ).rejects.toBeInstanceOf(DocumentPendingDeleteError);
  });

  it("soft-deletes anchored doc but keeps anchors row", async () => {
    const { db, userId } = await setup();
    const storage = createMemoryStorage();
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        name: "a.txt",
        mimeType: "text/plain",
        sizeBytes: 50,
        sha256: "b".repeat(64),
        storageKey: "k4",
        status: "anchored",
      })
      .returning();
    await db.insert(anchors).values({
      documentId: doc.id,
      network: "testnet",
      txHash: "c".repeat(64),
    });

    await deleteDocumentForUser(db, storage, userId, doc.id);

    const anchorRow = await db.query.anchors.findFirst({
      where: eq(anchors.documentId, doc.id),
    });
    expect(anchorRow).not.toBeUndefined();
    const docRow = await db.query.documents.findFirst({
      where: eq(documents.id, doc.id),
    });
    expect(docRow?.deletedAt).not.toBeNull();
  });
});
