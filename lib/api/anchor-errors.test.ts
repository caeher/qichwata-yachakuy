import { describe, expect, it } from "vitest";

import { anchorQuotaExceededBody } from "@/lib/api/anchor-errors";
import { QUOTA_ANCHORS } from "@/lib/api/quota-codes";

describe("anchorQuotaExceededBody", () => {
  it("maps to public QUOTA_ANCHORS", () => {
    expect(anchorQuotaExceededBody(10, 10)).toEqual({
      error: QUOTA_ANCHORS,
      included: 10,
      used: 10,
    });
  });
});
