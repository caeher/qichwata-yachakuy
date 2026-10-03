import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { anchors, auditEvents, documents, users } from "@/db/schema";
import { provisionLegacyFreeUser } from "@/db/test-fixtures";
import { eraseUserAccount } from "@/lib/privacy/erase-user";

describe("eraseUserAccount", () => {
  it("redacts account data while preserving hashes and blockchain proofs", async () => {
    const { db } = await createTestDb();
    const { userId } = await provisionLegacyFreeUser(db, {
      clerkUserId: "erase_a",
      email: "a@example.com",
    });
    const other = await provisionLegacyFreeUser(db, {
      clerkUserId: "erase_b",
      email: "b@example.com",
    });

    const [historical] = await db
      .insert(documents)
      .values({
        userId,
        name: "historical.txt",
        sha256: "1".repeat(64),
        status: "anchored",
      })
      .returning();
    await db.insert(documents).values({
      userId: other.userId,
      name: "other.txt",
      sha256: "2".repeat(64),
      status: "draft",
    });
    await db.insert(anchors).values({
      documentId: historical.id,
      network: "testnet",
      txHash: "3".repeat(64),
    });

    await eraseUserAccount(db, "erase_a");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.email).toBeNull();
    expect(user?.deletedAt).not.toBeNull();

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, historical.id),
    });
    expect(doc?.name).toBe("deleted");
    expect(doc?.sha256).toBe("1".repeat(64));
    expect(doc?.deletedAt).not.toBeNull();

    const anchor = await db.query.anchors.findFirst({
      where: eq(anchors.documentId, historical.id),
    });
    expect(anchor?.txHash).toBe("3".repeat(64));

    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, userId));
    expect(
      audits.filter((event) => event.action === "account_erasure"),
    ).toHaveLength(1);

    await eraseUserAccount(db, "erase_a");
    const auditsAgain = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, userId));
    expect(
      auditsAgain.filter((event) => event.action === "account_erasure"),
    ).toHaveLength(1);
  });
});
