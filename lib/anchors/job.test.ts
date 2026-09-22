import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { auditEvents, documents, usageEvents } from "@/db/schema";
import { provisionFreePlan } from "@/lib/auth/provision-user";
import { runAnchorJob } from "@/lib/anchors/job";
import type { AnchorClient } from "@/lib/stellar/anchor-types";

const OPERATOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

async function draftDoc() {
  const { db } = await createTestDb();
  await seedPlans(db);
  const { userId } = await provisionFreePlan(db, {
    clerkUserId: "clerk_job",
    email: "j@example.com",
  });
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      name: "j.txt",
      mimeType: "text/plain",
      sizeBytes: 1,
      sha256: "1".repeat(64),
      storageKey: `${userId}/j`,
      status: "draft",
    })
    .returning();
  return { db, userId, doc };
}

describe("runAnchorJob", () => {
  it("anchors via submit success", async () => {
    const { db, userId, doc } = await draftDoc();
    const chain: AnchorClient = {
      verify: vi.fn().mockResolvedValue(null),
      submitAnchor: vi.fn().mockResolvedValue({
        txHash: "a".repeat(64),
        status: "SUCCESS",
        ledger: 50,
        feeStroops: "100",
        record: {
          owner: OPERATOR,
          metaCid: `doc:${doc.id}`,
          ledger: 50,
          timestamp: 1,
        },
        error: null,
      }),
      poll: vi.fn(),
    };

    const result = await runAnchorJob(db, chain, {
      userId,
      documentId: doc.id,
      network: "testnet",
      contractId: "CONTRACT",
      operatorPublicKey: OPERATOR,
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.status).toBe("anchored");
      expect(result.detail.anchor?.expertUrl).toContain("/testnet/tx/");
    }
    const events = await db.select().from(usageEvents);
    expect(events.filter((e) => e.type === "anchor")).toHaveLength(1);
    const audits = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.documentId, doc.id));
    expect(audits.map((a) => a.action).sort()).toEqual(
      ["anchor_settled", "anchor_submit"].sort(),
    );
  });

  it("returns hash_already_anchored when meta differs", async () => {
    const { db, userId, doc } = await draftDoc();
    const chain: AnchorClient = {
      verify: vi.fn().mockResolvedValue({
        owner: OPERATOR,
        metaCid: "doc:other",
        ledger: 1,
        timestamp: 1,
      }),
      submitAnchor: vi.fn(),
      poll: vi.fn(),
    };

    const result = await runAnchorJob(db, chain, {
      userId,
      documentId: doc.id,
      network: "testnet",
      contractId: "CONTRACT",
      operatorPublicKey: OPERATOR,
    });

    expect(result).toEqual({
      error: "hash_already_anchored",
      sha256: doc.sha256,
    });
    const row = await db.query.documents.findFirst({
      where: eq(documents.id, doc.id),
    });
    expect(row?.status).toBe("draft");
    expect(chain.submitAnchor).not.toHaveBeenCalled();
  });

  it("settles from poll without submit", async () => {
    const { db, userId, doc } = await draftDoc();
    await db
      .update(documents)
      .set({
        status: "pending",
        pendingTxHash: "tx-existing",
        pendingAt: new Date(),
      })
      .where(eq(documents.id, doc.id));

    const chain: AnchorClient = {
      verify: vi.fn(),
      submitAnchor: vi.fn(),
      poll: vi.fn().mockResolvedValue({
        txHash: "tx-existing",
        status: "SUCCESS",
        ledger: 77,
        feeStroops: "100",
        record: {
          owner: OPERATOR,
          metaCid: `doc:${doc.id}`,
          ledger: 77,
          timestamp: 1,
        },
        error: null,
      }),
    };

    const result = await runAnchorJob(db, chain, {
      userId,
      documentId: doc.id,
      network: "testnet",
      contractId: "CONTRACT",
      operatorPublicKey: OPERATOR,
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.status).toBe("anchored");
    }
    expect(chain.submitAnchor).not.toHaveBeenCalled();
  });
});
