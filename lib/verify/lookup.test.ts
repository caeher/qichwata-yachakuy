import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { anchors, documents } from "@/db/schema";
import { provisionLegacyFreeUser } from "@/db/test-fixtures";
import { ChainUnavailableError, lookupAnchor } from "@/lib/verify/lookup";

const SHA_A = "a".repeat(64);

async function seedAnchored(
  sha256: string,
  anchoredAt: Date,
  deletedAt: Date | null = null,
) {
  const { db } = await createTestDb();
  const { userId } = await provisionLegacyFreeUser(db, {
    clerkUserId: `clerk_${sha256.slice(0, 4)}`,
    email: "u@example.com",
  });
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      name: "x.txt",
      sha256,
      status: "anchored",
      deletedAt,
    })
    .returning();
  await db.insert(anchors).values({
    documentId: doc.id,
    network: "testnet",
    txHash: `tx-${sha256.slice(0, 8)}`,
    anchoredAt,
  });
  return { db, doc };
}

describe("lookupAnchor", () => {
  it("returns database hit when chain not configured", async () => {
    const { db } = await seedAnchored(SHA_A, new Date("2026-01-02"));
    const chain = async () => ({ configured: false as const });
    const result = await lookupAnchor(db, chain, SHA_A, null);
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.source).toBe("database");
      expect(result.onChain).toBeNull();
      expect(result.txHash).toBe(`tx-${"a".repeat(8)}`);
    }
  });

  it("not_found without db or chain", async () => {
    const { db } = await createTestDb();
    const result = await lookupAnchor(
      db,
      async () => ({ configured: false }),
      SHA_A,
      null,
    );
    expect(result).toEqual({ status: "not_found", sha256: SHA_A });
  });

  it("chain-only anchored", async () => {
    const { db } = await createTestDb();
    const result = await lookupAnchor(
      db,
      async () => ({
        configured: true,
        record: {
          owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
          metaCid: "doc:1",
          ledger: 9,
          timestamp: 1_700_000_000,
        },
      }),
      SHA_A,
      "C123",
    );
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.source).toBe("chain");
      expect(result.txHash).toBeNull();
    }
  });

  it("db hit with chain null record sets onChain false", async () => {
    const { db } = await seedAnchored(SHA_A, new Date());
    const result = await lookupAnchor(
      db,
      async () => ({ configured: true, record: null }),
      SHA_A,
      "C1",
    );
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.onChain).toBe(false);
    }
  });

  it("keeps soft-deleted hashes queryable for historical anchors", async () => {
    const { db } = await seedAnchored(SHA_A, new Date(), new Date());
    const result = await lookupAnchor(
      db,
      async () => ({ configured: false }),
      SHA_A,
      null,
    );
    expect(result.status).toBe("anchored");
  });

  it("picks earliest anchor", async () => {
    const { db, doc } = await seedAnchored(SHA_A, new Date("2026-02-01"));
    await db.insert(anchors).values({
      documentId: doc.id,
      network: "testnet",
      txHash: "tx-later",
      anchoredAt: new Date("2026-03-01"),
    });
    const result = await lookupAnchor(
      db,
      async () => ({ configured: false }),
      SHA_A,
      null,
    );
    if (result.status === "anchored") {
      expect(result.txHash).toBe(`tx-${"a".repeat(8)}`);
    }
  });

  it("throws ChainUnavailableError when chain fails and db misses", async () => {
    const { db } = await createTestDb();
    await expect(
      lookupAnchor(
        db,
        async () => {
          throw new Error("rpc down");
        },
        SHA_A,
        null,
      ),
    ).rejects.toBeInstanceOf(ChainUnavailableError);
  });

  it("returns database when chain throws but row exists", async () => {
    const { db } = await seedAnchored(SHA_A, new Date());
    const result = await lookupAnchor(
      db,
      async () => {
        throw new Error("rpc down");
      },
      SHA_A,
      null,
    );
    expect(result.status).toBe("anchored");
    if (result.status === "anchored") {
      expect(result.onChain).toBeNull();
    }
  });
});
