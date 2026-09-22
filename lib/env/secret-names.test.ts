import { describe, expect, it } from "vitest";

import { SERVER_SECRET_ENV_NAMES } from "@/lib/env/secret-names";

describe("SERVER_SECRET_ENV_NAMES", () => {
  it("never uses NEXT_PUBLIC_ prefix", () => {
    for (const name of SERVER_SECRET_ENV_NAMES) {
      expect(name.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});
