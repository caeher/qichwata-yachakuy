import { describe, expect, it } from "vitest";

import { consumeToken } from "@/lib/verify/rate-limit";

describe("consumeToken", () => {
  it("allows 30 then denies until window passes", () => {
    const store = new Map<string, { timestamps: number[] }>();
    const now = 1_000_000;
    for (let i = 0; i < 30; i += 1) {
      const result = consumeToken({
        key: "1.2.3.4",
        now: now + i,
        store,
        limit: 30,
        windowMs: 60_000,
      });
      expect(result.ok).toBe(true);
    }
    const denied = consumeToken({
      key: "1.2.3.4",
      now: now + 30,
      store,
      limit: 30,
      windowMs: 60_000,
    });
    expect(denied.ok).toBe(false);
    const later = consumeToken({
      key: "1.2.3.4",
      now: now + 60_001,
      store,
      limit: 30,
      windowMs: 60_000,
    });
    expect(later.ok).toBe(true);
  });
});
