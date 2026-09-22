import { Keypair } from "@stellar/stellar-sdk";

import { createAnchorClient } from "@/lib/stellar/anchor-client";
import { createStellarClients } from "@/lib/stellar/client";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import type { AnchorClient } from "@/lib/stellar/anchor-types";

export type AnchorRuntimeConfig =
  | { configured: false }
  | {
      configured: true;
      network: "testnet" | "mainnet";
      contractId: string;
      operatorPublicKey: string;
      chain: AnchorClient;
    };

export function getAnchorRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): AnchorRuntimeConfig {
  const secret = env.STELLAR_HOT_WALLET_SECRET?.trim();
  const contractId = env.STELLAR_CONTRACT_ID?.trim();
  if (!secret || !contractId) {
    return { configured: false };
  }

  const endpoints = resolveStellarEndpoints(env);
  const clients = createStellarClients(env);
  if (!clients.rpc) {
    return { configured: false };
  }

  const signer = Keypair.fromSecret(secret);
  const chain = createAnchorClient({
    rpc: clients.rpc,
    networkPassphrase: endpoints.expectedPassphrase,
    contractId,
    signer,
  });

  return {
    configured: true,
    network: endpoints.network,
    contractId,
    operatorPublicKey: signer.publicKey(),
    chain,
  };
}
