import type { StellarEndpoints } from "@/lib/stellar/endpoints";

export type StellarProbe = {
  getNetwork: () => Promise<{ passphrase: string }>;
  getLatestLedger: () => Promise<{ sequence: number }>;
};

export type HorizonProbe = {
  passphrase: () => Promise<string>;
  latestLedger: () => Promise<number>;
};

export type HealthSuccessBody = {
  ok: true;
  network: StellarEndpoints["network"];
  passphrase: string;
  latestLedger: number;
  provider: StellarEndpoints["provider"];
};

export type HealthErrorCode =
  | "network_mismatch"
  | "stellar_unreachable";

export class NetworkMismatchError extends Error {
  constructor() {
    super("network_mismatch");
    this.name = "NetworkMismatchError";
  }
}

export class StellarUnreachableError extends Error {
  constructor() {
    super("stellar_unreachable");
    this.name = "StellarUnreachableError";
  }
}

async function probeRpc(
  probe: StellarProbe,
  expectedPassphrase: string,
): Promise<{ passphrase: string; latestLedger: number }> {
  const network = await probe.getNetwork();
  if (network.passphrase !== expectedPassphrase) {
    throw new NetworkMismatchError();
  }
  const ledger = await probe.getLatestLedger();
  return { passphrase: network.passphrase, latestLedger: ledger.sequence };
}

async function probeHorizon(
  probe: HorizonProbe,
  expectedPassphrase: string,
): Promise<{ passphrase: string; latestLedger: number }> {
  const passphrase = await probe.passphrase();
  if (passphrase !== expectedPassphrase) {
    throw new NetworkMismatchError();
  }
  const latestLedger = await probe.latestLedger();
  return { passphrase, latestLedger };
}

export async function readHealth(input: {
  endpoints: StellarEndpoints;
  primary: StellarProbe | null;
  fallback: StellarProbe | null;
  horizon: HorizonProbe;
}): Promise<HealthSuccessBody> {
  const { endpoints, primary, fallback, horizon } = input;

  if (primary) {
    try {
      const result = await probeRpc(primary, endpoints.expectedPassphrase);
      return {
        ok: true,
        network: endpoints.network,
        passphrase: result.passphrase,
        latestLedger: result.latestLedger,
        provider: endpoints.provider,
      };
    } catch (error) {
      if (error instanceof NetworkMismatchError) {
        throw error;
      }
      if (fallback) {
        try {
          const result = await probeRpc(
            fallback,
            endpoints.expectedPassphrase,
          );
          return {
            ok: true,
            network: endpoints.network,
            passphrase: result.passphrase,
            latestLedger: result.latestLedger,
            provider: "public-rpc",
          };
        } catch (fallbackError) {
          if (fallbackError instanceof NetworkMismatchError) {
            throw fallbackError;
          }
        }
      }
    }
  }

  try {
    const result = await probeHorizon(horizon, endpoints.expectedPassphrase);
    return {
      ok: true,
      network: endpoints.network,
      passphrase: result.passphrase,
      latestLedger: result.latestLedger,
      provider: "horizon",
    };
  } catch (error) {
    if (error instanceof NetworkMismatchError) {
      throw error;
    }
    throw new StellarUnreachableError();
  }
}
