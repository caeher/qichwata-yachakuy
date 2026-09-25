import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards that critical call sites branch on convexConfigured() before Drizzle.
 */
describe("Convex-only path contracts", () => {
  it("education service branches before Drizzle enroll/complete/finalize", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/education/service.ts"),
      "utf8",
    );
    const convexBranches = source.match(/if \(convexConfigured\(\)\)/g) ?? [];
    expect(convexBranches.length).toBeGreaterThanOrEqual(3);
  });

  it("getDb throws when Convex is the active store", () => {
    const source = readFileSync(
      path.join(process.cwd(), "db/client.ts"),
      "utf8",
    );
    expect(source).toContain("convexConfigured()");
    expect(source).toContain("PostgreSQL getDb() is disabled");
  });

  it("certificate verification uses Convex queries when configured", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/certificates/verify.ts"),
      "utf8",
    );
    expect(source).toContain("api.certificates.getByPublicId");
    expect(source).toContain("api.certificates.getBySha256");
  });
});
