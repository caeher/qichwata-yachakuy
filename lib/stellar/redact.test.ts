import { describe, expect, it } from "vitest";

import { redact } from "@/lib/stellar/redact";

describe("redact", () => {
  it("redacts alchemy key and stellar secret", () => {
    const secret = "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK3D";
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

  it("redacts database and s3 secrets", () => {
    const env = {
      DATABASE_URL: "postgres://user:pass@host/db",
      S3_SECRET_ACCESS_KEY: "s3-secret-value",
    };
    const input = `db=${env.DATABASE_URL} s3=${env.S3_SECRET_ACCESS_KEY}`;
    const out = redact(input, env);
    expect(out).not.toContain("postgres://user:pass@host/db");
    expect(out).not.toContain("s3-secret-value");
  });
});
