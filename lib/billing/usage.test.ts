import { describe, expect, it } from "vitest";

import { FREE_MONTHLY_ANCHORS } from "@/db/constants";
import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { documents, usageEvents } from "@/db/schema";
import { loadUsageSummary } from "@/lib/billing/usage";
import { provisionFreePlan } from "@/lib/auth/provision-user";

describe("loadUsageSummary", () => {
  it("counts settled anchors and pending documents in the UTC month", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);
    const { userId } = await provisionFreePlan(db, {
      clerkUserId: "usage_test",
      email: "u@example.com",
    });

    const now = new Date("2025-06-15T12:00:00.000Z");

    await db.insert(usageEvents).values({
      userId,
      type: "anchor",
      bytesDelta: 0,
      meta: {},
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
    });

    await db.insert(usageEvents).values({
      userId,
      type: "anchor",
      bytesDelta: 0,
      meta: {},
      createdAt: new Date("2025-05-31T23:59:59.000Z"),
    });

    await db.insert(documents).values({
      userId,
      name: "pending.txt",
      mimeType: "text/plain",
      sizeBytes: 10,
      sha256: "a".repeat(64),
      storageKey: `${userId}/pending`,
      status: "pending",
    });

    const summary = await loadUsageSummary(db, userId, now);
    expect(summary).not.toBeNull();
    expect(summary?.anchorsIncluded).toBe(FREE_MONTHLY_ANCHORS);
    expect(summary?.anchorsSettled).toBe(1);
    expect(summary?.anchorsPending).toBe(1);
  });
});
