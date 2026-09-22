import { describe, expect, it } from "vitest";

import { stroopsToFeeXlm } from "@/lib/anchors/fee";

describe("stroopsToFeeXlm", () => {
  it("formats stroops with 7 decimals", () => {
    expect(stroopsToFeeXlm("100")).toBe("0.0000100");
    expect(stroopsToFeeXlm("10000000")).toBe("1.0000000");
    expect(stroopsToFeeXlm("0")).toBe("0.0000000");
    expect(stroopsToFeeXlm(null)).toBeNull();
  });
});
