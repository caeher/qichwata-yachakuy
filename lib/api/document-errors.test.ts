import { describe, expect, it } from "vitest";

import { documentErrorResponse } from "@/lib/api/document-errors";
import { QUOTA_STORAGE } from "@/lib/api/quota-codes";
import { QuotaExceededError } from "@/db/quota";

describe("documentErrorResponse", () => {
  it("maps QuotaExceededError to QUOTA_STORAGE", async () => {
    const response = documentErrorResponse(
      new QuotaExceededError(104_857_600, 100_000_000),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      error: QUOTA_STORAGE,
      limitBytes: 104_857_600,
      usedBytes: 100_000_000,
    });
  });
});
