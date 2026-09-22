import { describe, expect, it, vi } from "vitest";

import {
  isBelowMin,
  readHotWalletStatus,
  xlmToStroops,
} from "@/lib/stellar/wallet-balance";

const VALID_SECRET =
  "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK3D";

describe("wallet-balance", () => {
  it("empty secret does not load account", async () => {
    const loadAccount = vi.fn();
    const status = await readHotWalletStatus({
      secret: "",
      network: "testnet",
      minXlmEnv: undefined,
      loadAccount,
    });
    expect(status).toEqual({ configured: false });
    expect(loadAccount).not.toHaveBeenCalled();
  });

  it("isBelowMin", () => {
    expect(isBelowMin("9.9999999", "10")).toBe(true);
    expect(isBelowMin("10", "10")).toBe(false);
  });

  it("rejects too many decimals", () => {
    expect(xlmToStroops("10.00000001")).toBeNull();
  });

  it("wallet_unreadable on load failure without leaking secret", async () => {
    const loadAccount = vi.fn().mockRejectedValue(new Error("network"));
    const status = await readHotWalletStatus({
      secret: VALID_SECRET,
      network: "testnet",
      minXlmEnv: undefined,
      loadAccount,
    });
    expect(status).toEqual({ configured: true, error: "wallet_unreadable" });
    expect(JSON.stringify(status)).not.toContain(VALID_SECRET);
  });

  it("falls back min when env invalid", async () => {
    const loadAccount = vi.fn().mockResolvedValue({
      balances: [{ asset_type: "native", balance: "100" }],
    });
    const status = await readHotWalletStatus({
      secret: VALID_SECRET,
      network: "testnet",
      minXlmEnv: "not-a-number",
      loadAccount,
    });
    if (status.configured && !("error" in status)) {
      expect(status.minXlm).toBe("10");
    }
  });
});
