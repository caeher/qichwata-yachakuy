import { describe, expect, it } from "vitest";

import { resolveSignedUrlTtl } from "@/lib/storage/ttl";

describe("resolveSignedUrlTtl", () => {
  it("defaults to 60", () => {
    expect(resolveSignedUrlTtl({})).toBe(60);
    expect(resolveSignedUrlTtl({ STORAGE_SIGNED_URL_TTL_SECONDS: "" })).toBe(
      60,
    );
  });

  it("clamps to 15–300", () => {
    expect(resolveSignedUrlTtl({ STORAGE_SIGNED_URL_TTL_SECONDS: "10" })).toBe(
      15,
    );
    expect(resolveSignedUrlTtl({ STORAGE_SIGNED_URL_TTL_SECONDS: "500" })).toBe(
      300,
    );
    expect(resolveSignedUrlTtl({ STORAGE_SIGNED_URL_TTL_SECONDS: "120" })).toBe(
      120,
    );
  });
});
