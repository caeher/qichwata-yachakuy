import { describe, expect, it } from "vitest";

import { isBillingEnabled } from "@/lib/billing/flags";

describe("isBillingEnabled", () => {
  it("is false when unset or not exactly true", () => {
    expect(isBillingEnabled({})).toBe(false);
    expect(isBillingEnabled({ BILLING_ENABLED: "" })).toBe(false);
    expect(isBillingEnabled({ BILLING_ENABLED: "false" })).toBe(false);
    expect(isBillingEnabled({ BILLING_ENABLED: " true " })).toBe(false);
  });

  it("is true only for BILLING_ENABLED=true", () => {
    expect(isBillingEnabled({ BILLING_ENABLED: "true" })).toBe(true);
  });
});
