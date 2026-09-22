import { describe, expect, it } from "vitest";

import { createMemoryStorage } from "@/lib/storage/memory";
import { signStorageToken } from "@/lib/storage/sign-local";
import { openSignedDownload } from "@/lib/uploads/open-signed-download";

describe("openSignedDownload", () => {
  it("returns bytes when token and blob are valid", async () => {
    const signingKey = new Uint8Array(32).fill(1);
    const storage = createMemoryStorage({
      signingKey,
      nowSeconds: () => 1000,
    });
    const key = "u/2026/09/d";
    const body = new Uint8Array([9, 8, 7]);
    await storage.put(key, body, "text/plain");

    const token = signStorageToken(
      { k: key, e: 1060, n: "f.txt", c: "text/plain" },
      signingKey,
    );
    const result = await openSignedDownload(storage, token, signingKey, 1000);
    expect(result?.body).toEqual(body);
    expect(result?.downloadName).toBe("f.txt");
    expect(result?.contentType).toBe("text/plain");
  });

  it("returns null for bad token", async () => {
    const storage = createMemoryStorage();
    const key = new Uint8Array(32).fill(2);
    expect(await openSignedDownload(storage, "bad", key, 0)).toBeNull();
  });
});
