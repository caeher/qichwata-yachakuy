import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  AnchorQuotaExceededError,
  countAnchorUsage,
  failAnchor,
  reserveAnchor,
  settleAnchor,
} from "@/db/anchor-quota";
import { LEGACY_MONTHLY_ANCHOR_LIMIT } from "@/db/constants";
import { createTestDb } from "@/db/pglite";
import { documents, usageEvents } from "@/db/schema";
import { provisionLegacyFreeUser } from "@/db/test-fixtures";

async function setupUser() {
  const { db } = await createTestDb();
  const { userId } = await provisionLegacyFreeUser(db, {
    clerkUserId: "clerk_quota",
    email: "q@example.com",
  });
  return { db, userId };
}

async function insertDraft(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  userId: string,
  sha: string,
) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      name: "d.txt",
      sha256: sha,
      status: "draft",
    })
    .returning();
  return doc;
}

describe("anchor-quota", () => {
  it("blocks 11th reserve in the same month", async () => {
    const { db, userId } = await setupUser();
    const now = new Date();

    for (let i = 0; i < LEGACY_MONTHLY_ANCHOR_LIMIT; i += 1) {
      const sha = `${i.toString(16)}`.padStart(64, "a");
      const doc = await insertDraft(db, userId, sha);
      await db
        .update(documents)
        .set({ status: "pending", pendingAt: now })
        .where(eq(documents.id, doc.id));
      await settleAnchor(db, {
        userId,
        documentId: doc.id,
        sha256: sha,
        network: "testnet",
        txHash: `tx-${i}`,
        ledger: 1,
        contractId: "C1",
        feeXlm: null,
      });
    }

    const extra = await insertDraft(db, userId, "c".repeat(64));
    await expect(
      reserveAnchor(db, { userId, documentId: extra.id, now }),
    ).rejects.toBeInstanceOf(AnchorQuotaExceededError);

    const row = await db.query.documents.findFirst({
      where: eq(documents.id, extra.id),
    });
    expect(row?.status).toBe("draft");
  });

  it("counts pending toward quota", async () => {
    const { db, userId } = await setupUser();
    const now = new Date();
    const pending = await insertDraft(db, userId, "d".repeat(64));
    await db
      .update(documents)
      .set({ status: "pending", pendingAt: new Date("2025-01-01") })
      .where(eq(documents.id, pending.id));

    const used = await db.transaction((tx) =>
      countAnchorUsage(tx, userId, now),
    );
    expect(used).toBe(1);
  });

  it("settle writes anchor and usage once", async () => {
    const { db, userId } = await setupUser();
    const doc = await insertDraft(db, userId, "e".repeat(64));
    await db
      .update(documents)
      .set({ status: "pending", pendingAt: new Date() })
      .where(eq(documents.id, doc.id));

    await settleAnchor(db, {
      userId,
      documentId: doc.id,
      sha256: doc.sha256,
      network: "testnet",
      txHash: "f".repeat(64),
      ledger: 2,
      contractId: "C1",
      feeXlm: "0.0000100",
    });

    const updated = await db.query.documents.findFirst({
      where: eq(documents.id, doc.id),
    });
    expect(updated?.status).toBe("anchored");
    expect(updated?.pendingTxHash).toBeNull();

    const events = await db.select().from(usageEvents);
    expect(events.filter((e) => e.type === "anchor")).toHaveLength(1);

    await settleAnchor(db, {
      userId,
      documentId: doc.id,
      sha256: doc.sha256,
      network: "testnet",
      txHash: "f".repeat(64),
      ledger: 2,
      contractId: "C1",
      feeXlm: null,
    });
    const eventsAfter = await db.select().from(usageEvents);
    expect(eventsAfter.filter((e) => e.type === "anchor")).toHaveLength(1);
  });

  it("failAnchor does not add usage", async () => {
    const { db, userId } = await setupUser();
    const doc = await insertDraft(db, userId, "f".repeat(64));
    await db
      .update(documents)
      .set({ status: "pending", pendingAt: new Date() })
      .where(eq(documents.id, doc.id));
    await failAnchor(db, doc.id);
    const events = await db.select().from(usageEvents);
    expect(events).toHaveLength(0);
    const row = await db.query.documents.findFirst({
      where: eq(documents.id, doc.id),
    });
    expect(row?.status).toBe("failed");
  });
});
