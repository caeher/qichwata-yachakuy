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
});
