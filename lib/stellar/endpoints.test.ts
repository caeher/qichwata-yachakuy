import { describe, expect, it } from "vitest";

import {
  publicEndpointView,
  resolveStellarEndpoints,
} from "@/lib/stellar/endpoints";

describe("resolveStellarEndpoints", () => {
  it("uses public testnet RPC when key is empty", () => {
    const endpoints = resolveStellarEndpoints({});
    expect(endpoints.network).toBe("testnet");
    expect(endpoints.rpcUrl).toBe("https://soroban-testnet.stellar.org");
    expect(endpoints.provider).toBe("public-rpc");
    expect(endpoints.horizonUrl).toBe("https://horizon-testnet.stellar.org");
    expect(endpoints.fallbackRpcUrl).toBeNull();
  });

  it("uses Alchemy testnet when key is set", () => {
    const endpoints = resolveStellarEndpoints({
      ALCHEMY_STELLAR_API_KEY: "abc",
    });
    expect(endpoints.rpcUrl).toBe(
      "https://stellar-testnet.g.alchemy.com/v2/abc",
    );
    expect(endpoints.provider).toBe("alchemy");
    expect(endpoints.fallbackRpcUrl).toBe(
      "https://soroban-testnet.stellar.org",
    );
    const view = publicEndpointView(endpoints);
    expect(JSON.stringify(view)).not.toContain("abc");
  });

  it("uses horizon-only on mainnet without key", () => {
    const endpoints = resolveStellarEndpoints({ STELLAR_NETWORK: "mainnet" });
    expect(endpoints.rpcUrl).toBeNull();
    expect(endpoints.provider).toBe("horizon");
    expect(endpoints.horizonUrl).toBe("https://horizon.stellar.org");
  });

  it("uses Alchemy mainnet when key is set", () => {
    const endpoints = resolveStellarEndpoints({
      STELLAR_NETWORK: "mainnet",
      ALCHEMY_STELLAR_API_KEY: "k",
    });
    expect(endpoints.rpcUrl).toBe(
      "https://stellar-mainnet.g.alchemy.com/v2/k",
    );
    expect(endpoints.provider).toBe("alchemy");
  });

  it("throws on invalid network", () => {
    expect(() =>
      resolveStellarEndpoints({ STELLAR_NETWORK: "futurenet" }),
    ).toThrow("invalid_network");
  });

  it("treats whitespace key as empty", () => {
    const endpoints = resolveStellarEndpoints({
      ALCHEMY_STELLAR_API_KEY: "  ",
    });
    expect(endpoints.provider).toBe("public-rpc");
  });
});
