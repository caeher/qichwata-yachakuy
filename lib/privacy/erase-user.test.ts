import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { anchors, auditEvents, documents, users } from "@/db/schema";
import { provisionFreePlan } from "@/lib/auth/provision-user";
import { eraseUserAccount } from "@/lib/privacy/erase-user";
import { createMemoryStorage } from "@/lib/storage/memory";

describe("eraseUserAccount", () => {
  it("erases blobs, redacts profile, keeps anchors", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);
    const storage = createMemoryStorage();
    const { userId } = await provisionFreePlan(db, {
      clerkUserId: "erase_a",
      email: "a@example.com",
    });
    const other = await provisionFreePlan(db, {
      clerkUserId: "erase_b",
      email: "b@example.com",
    });

    const activeKey = `${userId}/active`;
    const deletedKey = `${userId}/old`;
    const [active] = await db
      .insert(documents)
      .values({
        userId,
        name: "active.txt",
        mimeType: "text/plain",
        sizeBytes: 10,
        sha256: "1".repeat(64),
        storageKey: activeKey,
        status: "anchored",
      })
      .returning();
    await db.insert(documents).values({
      userId,
      name: "old.txt",
      mimeType: "text/plain",
      sizeBytes: 5,
      sha256: "2".repeat(64),
      storageKey: deletedKey,
      status: "draft",
      deletedAt: new Date(),
    });
    await db.insert(anchors).values({
      documentId: active.id,
      network: "testnet",
      txHash: "3".repeat(64),
    });
    await storage.put(activeKey, new Uint8Array([1]), "text/plain");
    await storage.put(deletedKey, new Uint8Array([2]), "text/plain");
    const otherKey = `${other.userId}/other`;
    await storage.put(otherKey, new Uint8Array([3]), "text/plain");

    await eraseUserAccount(db, storage, "erase_a");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.email).toBeNull();
    expect(user?.deletedAt).not.toBeNull();
    expect(await storage.get(activeKey)).toBeNull();
    expect(await storage.get(deletedKey)).toBeNull();
    expect(await storage.get(otherKey)).not.toBeNull();

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));
    expect(docs.every((d) => d.name === "deleted")).toBe(true);
    expect(user?.storageUsedBytes).toBe(0);

    const anchorRow = await db.query.anchors.findFirst({
      where: eq(anchors.documentId, active.id),
    });
    expect(anchorRow).not.toBeUndefined();

    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, userId));
    expect(audits.filter((a) => a.action === "account_erasure")).toHaveLength(
      1,
    );

    await eraseUserAccount(db, storage, "erase_a");
    const auditsAgain = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, userId));
    expect(
      auditsAgain.filter((a) => a.action === "account_erasure"),
    ).toHaveLength(1);
  });
});
