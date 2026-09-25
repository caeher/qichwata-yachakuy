import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const EXPECTED_CONVEX_TABLES = [
  "plans",
  "users",
  "courses",
  "courseUnits",
  "enrollments",
  "unitProgress",
  "courseCompletions",
  "certificates",
  "documents",
  "anchors",
  "auditEvents",
  "usageEvents",
  "webhookEvents",
  "legacyObjectInventory",
];

describe("Convex schema parity (static)", () => {
  it("defines the same logical tables as the Drizzle migration target", () => {
    const schemaPath = path.join(process.cwd(), "convex/schema.ts");
    const source = readFileSync(schemaPath, "utf8");
    for (const table of EXPECTED_CONVEX_TABLES) {
      expect(source).toContain(`${table}: defineTable`);
    }
  });

  it("documents Convex as primary store in env example", () => {
    const envExample = readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8",
    );
    expect(envExample).toMatch(/Convex \(primary database\)/);
    expect(envExample).toMatch(/legacy\/tests only/);
  });
});
