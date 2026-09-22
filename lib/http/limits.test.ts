import { describe, expect, it } from "vitest";

import { checkAnchorRateLimit, checkUploadRateLimit } from "@/lib/http/limits";

describe("http limits", () => {
  it("upload limit is separate from anchor", () => {
    const now = 2_000_000;
    const userId = "user-limits";
    for (let i = 0; i < 10; i += 1) {
      expect(checkUploadRateLimit(userId, now + i).ok).toBe(true);
    }
    expect(checkUploadRateLimit(userId, now + 10).ok).toBe(false);
    expect(checkAnchorRateLimit(userId, now + 10).ok).toBe(true);
  });
});
