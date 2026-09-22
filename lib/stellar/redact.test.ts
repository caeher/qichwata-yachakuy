import { describe, expect, it } from "vitest";

import { redact } from "@/lib/stellar/redact";

describe("redact", () => {
  it("redacts alchemy key and stellar secret", () => {
    const secret =
      "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK3D";
    const env = {
      ALCHEMY_STELLAR_API_KEY: "my-alchemy-key",
      STELLAR_HOT_WALLET_SECRET: secret,
    };
    const input = `key=my-alchemy-key seed=${secret}`;
    const out = redact(input, env);
    expect(out).not.toContain("my-alchemy-key");
    expect(out).not.toContain(secret);
    expect(out).toContain("[redacted]");
  });
});
