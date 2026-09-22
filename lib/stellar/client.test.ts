import { describe, expect, it } from "vitest";

describe("createStellarClients", () => {
  it("imports and constructs without env", async () => {
    const mod = await import("@/lib/stellar/client");
    const clients = mod.createStellarClients({});
    expect(clients).not.toBeInstanceOf(Promise);
    expect(clients.rpc).not.toBeNull();
    expect(clients.endpoints.provider).toBe("public-rpc");
  });
});
