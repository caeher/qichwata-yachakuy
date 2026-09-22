import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/db/pglite";

let testDb: Awaited<ReturnType<typeof createTestDb>>["db"];

vi.mock("@/db/client", () => ({
  getDb: () => testDb,
}));

vi.mock("@/lib/verify/chain", () => ({
  createChainLookup: () => async () => ({ configured: false }),
}));

describe("POST /api/verify", () => {
  beforeEach(async () => {
    const { db } = await createTestDb();
    testDb = db;
    process.env.DATABASE_URL = "postgres://test";
  });

  it("returns not_found for unknown hash without clerk", async () => {
    const { POST } = await import("@/app/api/verify/route");
    const hash = "0".repeat(64);
    const response = await POST(
      new Request("http://localhost/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "not_found", sha256: hash });
  });
});
