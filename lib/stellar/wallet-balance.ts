import { Keypair } from "@stellar/stellar-sdk";

export const DEFAULT_MIN_XLM = {
  testnet: "10",
  mainnet: "20",
} as const;

export function xlmToStroops(xlm: string): bigint | null {
  const trimmed = xlm.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > 7) {
    return null;
  }
  const fracPadded = frac.padEnd(7, "0");
  try {
    return BigInt(whole) * BigInt(10_000_000) + BigInt(fracPadded);
  } catch {
    return null;
  }
}

export function isBelowMin(balance: string, min: string): boolean {
  const balanceStroops = xlmToStroops(balance);
  const minStroops = xlmToStroops(min);
  if (balanceStroops === null || minStroops === null) {
    return false;
  }
  return balanceStroops < minStroops;
}

export type WalletStatus =
  | { configured: false }
  | {
      configured: true;
      publicKey: string;
      nativeXlm: string;
      minXlm: string;
      low: boolean;
    }
  | { configured: true; error: "wallet_unreadable" };

export async function readHotWalletStatus(input: {
  secret: string | undefined;
  network: "testnet" | "mainnet";
  minXlmEnv: string | undefined;
  loadAccount: (
    publicKey: string,
  ) => Promise<{ balances: { asset_type: string; balance: string }[] }>;
}): Promise<WalletStatus> {
  const secret = input.secret?.trim();
  if (!secret) {
    return { configured: false };
  }

  const envMin = input.minXlmEnv?.trim();
  const minXlm =
    envMin && xlmToStroops(envMin) !== null
      ? envMin
      : DEFAULT_MIN_XLM[input.network];

  let publicKey: string;
  try {
    publicKey = Keypair.fromSecret(secret).publicKey();
  } catch {
    return { configured: true, error: "wallet_unreadable" };
  }

  try {
    const account = await input.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    if (!native) {
      return { configured: true, error: "wallet_unreadable" };
    }
    const low = isBelowMin(native.balance, minXlm);
    return {
      configured: true,
      publicKey,
      nativeXlm: native.balance,
      minXlm,
      low,
    };
  } catch {
    return { configured: true, error: "wallet_unreadable" };
  }
}
