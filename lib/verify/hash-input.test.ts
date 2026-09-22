import { describe, expect, it } from "vitest";

import {
  buildVerifyClaim,
  hashFromText,
  normalizeHashHex,
  VerifyInputError,
} from "@/lib/verify/hash-input";

describe("hash-input", () => {
  it("hashes UTF-8 abc like upload", () => {
    expect(hashFromText("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("treats newline variants differently", () => {
    expect(hashFromText("a\nb")).not.toBe(hashFromText("a\r\nb"));
  });

  it("normalizes hex without re-hashing", () => {
    const hex = "ab".repeat(32);
    const claim = buildVerifyClaim({ hashHex: hex.toUpperCase() });
    expect(claim.sha256).toBe(hex.toLowerCase());
    expect(claim.claimedSha256).toBeNull();
  });

  it("rejects 63 char hex", () => {
    expect(() => normalizeHashHex("a".repeat(63))).toThrow(VerifyInputError);
  });

  it("rejects empty file", () => {
    expect(() => buildVerifyClaim({ fileBytes: new Uint8Array() })).toThrow(
      VerifyInputError,
    );
  });

  it("allows empty text digest", () => {
    expect(buildVerifyClaim({ text: "" }).sha256).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
