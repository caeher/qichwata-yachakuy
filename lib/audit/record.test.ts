import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { auditEvents } from "@/db/schema";
import { recordAudit } from "@/lib/audit/record";

describe("recordAudit", () => {
  it("drops disallowed meta keys", async () => {
    const { db } = await createTestDb();
    await recordAudit(db, {
      userId: null,
      action: "anchor_submit",
      meta: {
        sha256: "a".repeat(64),
        storageKey: "secret/key",
        email: "x@y.com",
      },
    });
    const rows = await db.select().from(auditEvents);
    expect(rows[0]?.meta).toEqual({ sha256: "a".repeat(64) });
    expect(JSON.stringify(rows[0]?.meta)).not.toContain("storageKey");
  });
});
