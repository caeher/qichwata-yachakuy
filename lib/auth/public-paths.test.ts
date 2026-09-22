import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/lib/auth/public-paths";

describe("isProtectedPath", () => {
  it("allows public stellar health and verify", () => {
    expect(isProtectedPath("/api/stellar/health")).toBe(false);
    expect(isProtectedPath("/api/verify")).toBe(false);
  });

  it("protects documents api", () => {
    expect(isProtectedPath("/api/documents")).toBe(true);
  });

  it("allows clerk webhook", () => {
    expect(isProtectedPath("/api/webhooks/clerk")).toBe(false);
  });

  it("protects dashboard", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
  });

  it("allows marketing and verify pages", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/verify")).toBe(false);
    expect(isProtectedPath("/v/abc")).toBe(false);
  });
});
