import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedApplicationData } from "@/db/seed";
import {
  anchors,
  documents,
  legacyObjectInventory,
  plans,
  users,
  webhookEvents,
} from "@/db/schema";

describe("schema migrations and seed", () => {
  it("does not require commercial seed data for an individual account", async () => {
    const { db } = await createTestDb();
    await (
      seedApplicationData as unknown as (database: typeof db) => Promise<void>
    )(db);
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "individual_no_plan" })
      .returning();

    expect(user?.planId).toBeNull();
    expect(await db.select().from(plans)).toHaveLength(0);
  });

  it("enforces unique clerk_user_id and tx_hash", async () => {
    const { db } = await createTestDb();
    await db.insert(users).values({
      clerkUserId: "user_a",
      email: "a@example.com",
    });

    await expect(
      db.insert(users).values({
        clerkUserId: "user_a",
        email: "b@example.com",
      }),
    ).rejects.toThrow();

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, "user_a"),
    });
    if (!user) throw new Error("missing user");

    const doc = await db
      .insert(documents)
      .values({
        userId: user.id,
        name: "x.pdf",
        sha256: "a".repeat(64),
        status: "draft",
      })
      .returning();

    await db.insert(anchors).values({
      documentId: doc[0].id,
      network: "testnet",
      txHash: "hash1",
    });

    await expect(
      db.insert(anchors).values({
        documentId: doc[0].id,
        network: "testnet",
        txHash: "hash1",
      }),
    ).rejects.toThrow();
  });

  it("stores documents with sha256 lookup", async () => {
    const { db } = await createTestDb();
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "user_doc" })
      .returning();

    const sha = "b".repeat(64);
    await db.insert(documents).values({
      userId: user.id,
      name: "nota.txt",
      sha256: sha,
      status: "draft",
    });

    const found = await db.query.documents.findFirst({
      where: eq(documents.sha256, sha),
    });
    expect(found?.deletedAt).toBeNull();
  });

  it("allows pending status with pending_tx_hash column", async () => {
    const { db } = await createTestDb();
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "pending_user" })
      .returning();

    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        name: "p.txt",
        sha256: "c".repeat(64),
        status: "pending",
        pendingTxHash: null,
      })
      .returning();

    expect(doc.status).toBe("pending");
    expect(doc.pendingTxHash).toBeNull();
  });

  it("creates webhook_events table", async () => {
    const { db } = await createTestDb();
    await db.insert(webhookEvents).values({
      id: "msg_1",
      eventType: "user.created",
    });
    const row = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, "msg_1"),
    });
    expect(row?.eventType).toBe("user.created");
  });

  it("keeps an exportable legacy object inventory without document storage columns", async () => {
    const { db } = await createTestDb();
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "inventory_user" })
      .returning();
    const documentId = crypto.randomUUID();

    await db.insert(legacyObjectInventory).values({
      documentId,
      userId: user.id,
      objectKey: "legacy/object-key",
      originalMimeType: "application/pdf",
      originalSizeBytes: 42,
    });

    const inventory = await db.query.legacyObjectInventory.findFirst();
    const columns = await db.execute(sql`
      select column_name
      from information_schema.columns
      where table_name = 'documents'
        and column_name in ('storage_key', 'size_bytes', 'mime_type')
    `);
    expect(inventory?.objectKey).toBe("legacy/object-key");
    expect(columns.rows).toHaveLength(0);
  });
});
