import { createStellarClients } from "@/lib/stellar/client";
import { createVerifyOnlyClient } from "@/lib/stellar/anchor-client";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import type { ChainLookupResult } from "@/lib/verify/lookup";

export function createChainLookup(
  env: NodeJS.ProcessEnv = process.env,
): (hash: string) => Promise<ChainLookupResult> {
  const contractId = env.STELLAR_CONTRACT_ID?.trim();
  if (!contractId) {
    return async () => ({ configured: false });
  }

  const endpoints = resolveStellarEndpoints(env);
  const clients = createStellarClients(env);
  if (!clients.rpc) {
    return async () => ({ configured: false });
  }

  const verifyClient = createVerifyOnlyClient({
    rpc: clients.rpc,
    networkPassphrase: endpoints.expectedPassphrase,
    contractId,
  });

  return async (hash: string): Promise<ChainLookupResult> => {
    const record = await verifyClient.verify(hash);
    if (!record) {
      return { configured: true, record: null };
    }
    return { configured: true, record };
  };
}
