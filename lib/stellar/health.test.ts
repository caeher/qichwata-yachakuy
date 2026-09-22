import { describe, expect, it, vi } from "vitest";

import { TESTNET_PASSPHRASE } from "@/lib/stellar/endpoints";
import {
  NetworkMismatchError,
  readHealth,
  StellarUnreachableError,
} from "@/lib/stellar/health";

const endpoints = {
  network: "testnet" as const,
  expectedPassphrase: TESTNET_PASSPHRASE,
  rpcUrl: "https://stellar-testnet.g.alchemy.com/v2/x",
  horizonUrl: "https://horizon-testnet.stellar.org",
  provider: "alchemy" as const,
  fallbackRpcUrl: "https://soroban-testnet.stellar.org",
};

describe("readHealth", () => {
  it("returns primary probe result", async () => {
    const body = await readHealth({
      endpoints,
      primary: {
        getNetwork: async () => ({ passphrase: TESTNET_PASSPHRASE }),
        getLatestLedger: async () => ({ sequence: 42 }),
      },
      fallback: null,
      horizon: {
        passphrase: async () => TESTNET_PASSPHRASE,
        latestLedger: async () => 1,
      },
    });
    expect(body.provider).toBe("alchemy");
    expect(body.latestLedger).toBe(42);
  });

  it("falls back when primary throws", async () => {
    const body = await readHealth({
      endpoints,
      primary: {
        getNetwork: async () => {
          throw new Error("down");
        },
        getLatestLedger: async () => ({ sequence: 0 }),
      },
      fallback: {
        getNetwork: async () => ({ passphrase: TESTNET_PASSPHRASE }),
        getLatestLedger: async () => ({ sequence: 99 }),
      },
      horizon: {
        passphrase: async () => TESTNET_PASSPHRASE,
        latestLedger: async () => 1,
      },
    });
    expect(body.provider).toBe("public-rpc");
    expect(body.latestLedger).toBe(99);
  });

  it("rejects passphrase mismatch without calling fallback", async () => {
    const fallback = {
      getNetwork: vi.fn(),
      getLatestLedger: vi.fn(),
    };
    await expect(
      readHealth({
        endpoints,
        primary: {
          getNetwork: async () => ({ passphrase: "wrong" }),
          getLatestLedger: async () => ({ sequence: 1 }),
        },
        fallback,
        horizon: {
          passphrase: async () => TESTNET_PASSPHRASE,
          latestLedger: async () => 1,
        },
      }),
    ).rejects.toBeInstanceOf(NetworkMismatchError);
    expect(fallback.getNetwork).not.toHaveBeenCalled();
  });

  it("uses horizon when rpc probes fail", async () => {
    const body = await readHealth({
      endpoints,
      primary: {
        getNetwork: async () => {
          throw new Error("down");
        },
        getLatestLedger: async () => ({ sequence: 0 }),
      },
      fallback: {
        getNetwork: async () => {
          throw new Error("down");
        },
        getLatestLedger: async () => ({ sequence: 0 }),
      },
      horizon: {
        passphrase: async () => TESTNET_PASSPHRASE,
        latestLedger: async () => 77,
      },
    });
    expect(body.provider).toBe("horizon");
    expect(body.latestLedger).toBe(77);
  });

  it("throws when every probe fails", async () => {
    await expect(
      readHealth({
        endpoints,
        primary: null,
        fallback: null,
        horizon: {
          passphrase: async () => {
            throw new Error("down");
          },
          latestLedger: async () => 0,
        },
      }),
    ).rejects.toBeInstanceOf(StellarUnreachableError);
  });
});
