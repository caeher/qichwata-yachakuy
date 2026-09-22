import { describe, expect, it } from "vitest";

import { sha256Hex } from "@/lib/uploads/hash";
import { createMemoryStorage } from "@/lib/storage/memory";

describe("createMemoryStorage", () => {
  it("round-trips bytes unchanged", async () => {
    const storage = createMemoryStorage();
    const body = new Uint8Array([1, 2, 3, 4]);
    const hashBefore = sha256Hex(body);

    await storage.put("k1", body, "application/octet-stream");
    const loaded = await storage.get("k1");

    expect(loaded).toEqual(body);
    expect(sha256Hex(loaded!)).toBe(hashBefore);
  });

  it("delete removes blob", async () => {
    const storage = createMemoryStorage();
    await storage.put("k1", new Uint8Array([1]), "text/plain");
    await storage.delete("k1");
    expect(await storage.get("k1")).toBeNull();
  });

  it("signedUrl returns download path", async () => {
    const signingKey = new Uint8Array(32).fill(3);
    const storage = createMemoryStorage({
      signingKey,
      nowSeconds: () => 100,
    });
    const url = await storage.signedUrl("u/k", { expiresInSeconds: 60 });
    expect(url.startsWith("/api/storage/download?token=")).toBe(true);
  });
});
