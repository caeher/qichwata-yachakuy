import { Horizon, rpc } from "@stellar/stellar-sdk";

import {
  resolveStellarEndpoints,
  type StellarEndpoints,
} from "@/lib/stellar/endpoints";

export type StellarClients = {
  endpoints: StellarEndpoints;
  rpc: rpc.Server | null;
  horizon: Horizon.Server;
};

export function createStellarClients(
  env: Record<string, string | undefined> = process.env,
): StellarClients {
  const endpoints = resolveStellarEndpoints(env);
  const horizon = new Horizon.Server(endpoints.horizonUrl);
  const rpcClient =
    endpoints.rpcUrl !== null ? new rpc.Server(endpoints.rpcUrl) : null;
  return { endpoints, rpc: rpcClient, horizon };
}

export function createFallbackRpcClient(
  endpoints: StellarEndpoints,
): rpc.Server | null {
  if (!endpoints.fallbackRpcUrl) {
    return null;
  }
  return new rpc.Server(endpoints.fallbackRpcUrl);
}
