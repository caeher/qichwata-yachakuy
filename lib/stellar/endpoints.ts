export type StellarNetwork = "testnet" | "mainnet";

export type StellarEndpoints = {
  network: StellarNetwork;
  expectedPassphrase: string;
  rpcUrl: string | null;
  horizonUrl: string;
  provider: "alchemy" | "public-rpc" | "horizon";
  fallbackRpcUrl: string | null;
};

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

const PUBLIC_TESTNET_RPC = "https://soroban-testnet.stellar.org";
const PUBLIC_TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const PUBLIC_MAINNET_HORIZON = "https://horizon.stellar.org";

function trimKey(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveNetwork(env: Record<string, string | undefined>): StellarNetwork {
  const raw = env.STELLAR_NETWORK?.trim();
  if (!raw || raw === "testnet") {
    return "testnet";
  }
  if (raw === "mainnet") {
    return "mainnet";
  }
  throw new Error("invalid_network");
}

export function resolveStellarEndpoints(
  env: Record<string, string | undefined> = process.env,
): StellarEndpoints {
  const network = resolveNetwork(env);
  const key = trimKey(env.ALCHEMY_STELLAR_API_KEY);

  if (network === "testnet") {
    const horizonUrl = PUBLIC_TESTNET_HORIZON;
    const expectedPassphrase = TESTNET_PASSPHRASE;
    if (key) {
      return {
        network,
        expectedPassphrase,
        rpcUrl: `https://stellar-testnet.g.alchemy.com/v2/${key}`,
        horizonUrl,
        provider: "alchemy",
        fallbackRpcUrl: PUBLIC_TESTNET_RPC,
      };
    }
    return {
      network,
      expectedPassphrase,
      rpcUrl: PUBLIC_TESTNET_RPC,
      horizonUrl,
      provider: "public-rpc",
      fallbackRpcUrl: null,
    };
  }

  const horizonUrl = PUBLIC_MAINNET_HORIZON;
  const expectedPassphrase = MAINNET_PASSPHRASE;
  if (key) {
    return {
      network,
      expectedPassphrase,
      rpcUrl: `https://stellar-mainnet.g.alchemy.com/v2/${key}`,
      horizonUrl,
      provider: "alchemy",
      fallbackRpcUrl: null,
    };
  }
  return {
    network,
    expectedPassphrase,
    rpcUrl: null,
    horizonUrl,
    provider: "horizon",
    fallbackRpcUrl: null,
  };
}

/** Safe fields for logs when rpcUrl may embed the Alchemy key. */
export function publicEndpointView(endpoints: StellarEndpoints) {
  if (endpoints.provider === "alchemy") {
    return {
      network: endpoints.network,
      expectedPassphrase: endpoints.expectedPassphrase,
      horizonUrl: endpoints.horizonUrl,
      provider: endpoints.provider,
      fallbackRpcUrl: endpoints.fallbackRpcUrl,
    };
  }
  return {
    network: endpoints.network,
    expectedPassphrase: endpoints.expectedPassphrase,
    rpcUrl: endpoints.rpcUrl,
    horizonUrl: endpoints.horizonUrl,
    provider: endpoints.provider,
    fallbackRpcUrl: endpoints.fallbackRpcUrl,
  };
}
