import { describe, expect, it } from "vitest";

import {
  sanitizeDownloadName,
  signStorageToken,
  verifyStorageToken,
} from "@/lib/storage/sign-local";

describe("sign-local", () => {
  const key = new Uint8Array(32).fill(7);

  it("round-trips payload", () => {
    const token = signStorageToken(
      { k: "u/2026/09/doc", e: 9_999_999, n: "a.txt", c: "text/plain" },
      key,
    );
    const verified = verifyStorageToken(token, key, 1);
    expect(verified).toEqual({
      k: "u/2026/09/doc",
      e: 9_999_999,
      n: "a.txt",
      c: "text/plain",
    });
  });

  it("rejects expired token", () => {
    const token = signStorageToken({ k: "k", e: 100 }, key);
    expect(verifyStorageToken(token, key, 100)).toBeNull();
  });

  it("rejects tampered mac", () => {
    const token = signStorageToken({ k: "k", e: 9_999 }, key);
    const tampered = `${token.slice(0, -1)}x`;
    expect(verifyStorageToken(tampered, key, 1)).toBeNull();
  });

  it("rejects wrong signing key", () => {
    const token = signStorageToken({ k: "k", e: 9_999 }, key);
    const other = new Uint8Array(32).fill(8);
    expect(verifyStorageToken(token, other, 1)).toBeNull();
  });

  it("sanitizes download name", () => {
    expect(sanitizeDownloadName("folder/name.txt")).toBe("name.txt");
    expect(sanitizeDownloadName('bad";\r\nchars')).toBe("badchars");
  });
});
