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

  it("distinguishes an unknown public certificate id", async () => {
    const { POST } = await import("@/app/api/verify/route");
    const certificateId = "018f0000-0000-4000-8000-000000000001";
    const response = await POST(
      new Request("http://localhost/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.44",
        },
        body: JSON.stringify({ certificateId }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unknown", certificateId });
  });

  it("retires file and text verification while preserving hash lookup", async () => {
    const { POST } = await import("@/app/api/verify/route");
    const textResponse = await POST(
      new Request("http://localhost/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "contenido arbitrario" }),
      }),
    );
    expect(textResponse.status).toBe(410);
    expect(await textResponse.json()).toEqual({ error: "resource_retired" });

    const form = new FormData();
    form.set("file", new File(["contenido"], "archivo.txt"));
    const fileResponse = await POST(
      new Request("http://localhost/api/verify", {
        method: "POST",
        body: form,
      }),
    );
    expect(fileResponse.status).toBe(410);
  });
});
