import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/lib/auth/public-paths";

describe("isProtectedPath", () => {
  it("allows public stellar health and verify", () => {
    expect(isProtectedPath("/api/stellar/health")).toBe(false);
    expect(isProtectedPath("/api/verify")).toBe(false);
    expect(isProtectedPath("/api/storage/download")).toBe(false);
  });

  it("protects document mutations and mint download", () => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect(isProtectedPath(`/api/documents/${id}/anchor`)).toBe(true);
    expect(isProtectedPath(`/api/documents/${id}`)).toBe(true);
    expect(isProtectedPath(`/api/documents/${id}/download`)).toBe(true);
    expect(isProtectedPath("/api/storage")).toBe(true);
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
