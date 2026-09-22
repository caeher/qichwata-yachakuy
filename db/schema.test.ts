import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { anchors, documents, plans, users, webhookEvents } from "@/db/schema";
import {
  FREE_MAX_UPLOAD_BYTES,
  FREE_MONTHLY_ANCHORS,
  FREE_STORAGE_LIMIT_BYTES,
} from "@/db/constants";

describe("schema migrations and seed", () => {
  it("creates tables and seeds the free plan", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);

    const free = await db.query.plans.findFirst({
      where: eq(plans.slug, "free"),
    });
    expect(free).toBeDefined();
    expect(free?.storageLimitBytes).toBe(FREE_STORAGE_LIMIT_BYTES);
    expect(free?.maxUploadBytes).toBe(FREE_MAX_UPLOAD_BYTES);
    expect(free?.monthlyAnchorsIncluded).toBe(FREE_MONTHLY_ANCHORS);

    await seedPlans(db);
    const allFree = await db.select().from(plans).where(eq(plans.slug, "free"));
    expect(allFree).toHaveLength(1);
  });

  it("enforces unique clerk_user_id and tx_hash", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);
    const free = await db.query.plans.findFirst({
      where: eq(plans.slug, "free"),
    });
    if (!free) throw new Error("missing free plan");

    await db.insert(users).values({
      clerkUserId: "user_a",
      email: "a@example.com",
      planId: free.id,
    });

    await expect(
      db.insert(users).values({
        clerkUserId: "user_a",
        email: "b@example.com",
        planId: free.id,
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
        mimeType: "application/pdf",
        sizeBytes: 10,
        sha256: "a".repeat(64),
        storageKey: `${user.id}/2026/01/doc`,
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
    await seedPlans(db);
    const free = await db.query.plans.findFirst({
      where: eq(plans.slug, "free"),
    });
    if (!free) throw new Error("missing free plan");

    const [user] = await db
      .insert(users)
      .values({
        clerkUserId: "user_doc",
        planId: free.id,
      })
      .returning();

    const sha = "b".repeat(64);
    await db.insert(documents).values({
      userId: user.id,
      name: "nota.txt",
      mimeType: "text/plain",
      sizeBytes: 4,
      sha256: sha,
      storageKey: `${user.id}/2026/01/x`,
      status: "draft",
    });

    const found = await db.query.documents.findFirst({
      where: eq(documents.sha256, sha),
    });
    expect(found?.deletedAt).toBeNull();
  });

  it("allows pending status with pending_tx_hash column", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);
    const free = await db.query.plans.findFirst({
      where: eq(plans.slug, "free"),
    });
    if (!free) throw new Error("missing free plan");

    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "pending_user", planId: free.id })
      .returning();

    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        name: "p.txt",
        mimeType: "text/plain",
        sizeBytes: 0,
        sha256: "c".repeat(64),
        storageKey: `${user.id}/p`,
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
});
