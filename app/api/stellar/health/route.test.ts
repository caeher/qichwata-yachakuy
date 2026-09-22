import { beforeEach, describe, expect, it, vi } from "vitest";

const readHealthMock = vi.fn();

vi.mock("@/lib/stellar/client", () => ({
  createStellarClients: () => ({
    endpoints: {
      network: "testnet",
      provider: "alchemy",
      fallbackRpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org",
      expectedPassphrase: "Test SDF Network ; September 2015",
      rpcUrl: "https://stellar-testnet.g.alchemy.com/v2/secret-key",
    },
    rpc: {},
    horizon: {},
  }),
  createFallbackRpcClient: () => ({}),
}));

vi.mock("@/lib/stellar/endpoints", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/stellar/endpoints")>();
  return {
    ...actual,
    resolveStellarEndpoints: () => ({
      network: "testnet",
      provider: "alchemy",
      fallbackRpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org",
      expectedPassphrase: "Test SDF Network ; September 2015",
      rpcUrl: "https://stellar-testnet.g.alchemy.com/v2/secret-key",
    }),
  };
});

vi.mock("@/lib/stellar/health", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stellar/health")>();
  return {
    ...actual,
    readHealth: (...args: unknown[]) => readHealthMock(...args),
  };
});

describe("GET /api/stellar/health", () => {
  beforeEach(() => {
    readHealthMock.mockReset();
  });

  it("returns health json without leaking api key", async () => {
    readHealthMock.mockResolvedValue({
      ok: true,
      network: "testnet",
      passphrase: "Test SDF Network ; September 2015",
      latestLedger: 1,
      provider: "alchemy",
    });
    const { GET } = await import("@/app/api/stellar/health/route");
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });
});
