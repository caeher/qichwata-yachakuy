import { describe, expect, it } from "vitest";

import { keyBelongsToUser, storageKeyFor } from "@/lib/uploads/storage-key";

describe("storage-key", () => {
  const now = new Date(Date.UTC(2026, 8, 22));

  it("formats key with utc month", () => {
    expect(storageKeyFor("user", "doc", now)).toBe("user/2026/09/doc");
  });

  it("keyBelongsToUser", () => {
    const key = "user/2026/09/doc";
    expect(keyBelongsToUser(key, "user")).toBe(true);
    expect(keyBelongsToUser(key, "other")).toBe(false);
    expect(keyBelongsToUser("../etc/passwd", "user")).toBe(false);
    expect(keyBelongsToUser("/abs", "user")).toBe(false);
    expect(keyBelongsToUser("other/user/2026/09/doc", "user")).toBe(false);
  });
});
