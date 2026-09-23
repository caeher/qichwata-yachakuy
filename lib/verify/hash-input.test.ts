import { describe, expect, it } from "vitest";

import {
  buildVerifyClaim,
  normalizeHashHex,
  VerifyInputError,
} from "@/lib/verify/hash-input";

describe("hash-input", () => {
  it("normalizes a historical SHA-256 without re-hashing it", () => {
    const hex = "ab".repeat(32);
    const claim = buildVerifyClaim({ hashHex: hex.toUpperCase() });
    expect(claim).toEqual({ sha256: hex });
  });

  it("rejects invalid or missing hashes", () => {
    expect(() => normalizeHashHex("a".repeat(63))).toThrow(VerifyInputError);
    expect(() => buildVerifyClaim({})).toThrow(VerifyInputError);
  });
});
