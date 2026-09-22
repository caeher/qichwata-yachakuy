import {
  BASE_FEE,
  Contract,
  Keypair,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import type {
  AnchorClient,
  AnchorRecord,
  AnchorSubmitResult,
} from "@/lib/stellar/anchor-types";
import { mapPollStatus } from "@/lib/stellar/poll-status";
import {
  addressToScVal,
  hashToScVal,
  metaToScVal,
} from "@/lib/stellar/scval";

function mapQueryResult(result: unknown): AnchorRecord | null {
  if (result === null || result === undefined) {
    return null;
  }
  if (
    typeof result === "object" &&
    result !== null &&
    "owner" in result &&
    "meta_cid" in result
  ) {
    const row = result as {
      owner: string;
      meta_cid: string;
      ledger: number;
      timestamp: bigint | number;
    };
    return {
      owner: String(row.owner),
      metaCid: String(row.meta_cid),
      ledger: Number(row.ledger),
      timestamp: Number(row.timestamp),
    };
  }
  return null;
}

export function createAnchorClient(input: {
  rpc: rpc.Server;
  networkPassphrase: string;
  contractId: string;
  signer: Keypair;
}): AnchorClient {
  const { rpc: server, networkPassphrase, contractId, signer } = input;
  const contract = new Contract(contractId);

  return {
    async verify(hashHex: string): Promise<AnchorRecord | null> {
      const { result } = await server.queryContract(
        contractId,
        "verify",
        { hash: hashHex },
        networkPassphrase,
      );
      const mapped = mapQueryResult(result);
      if (mapped) {
        return mapped;
      }
      return null;
    },

    async submitAnchor({
      hashHex,
      metaCid,
      owner,
    }): Promise<AnchorSubmitResult> {
      try {
        const account = await server.getAccount(signer.publicKey());
        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase,
        })
          .addOperation(
            contract.call(
              "anchor",
              hashToScVal(hashHex),
              metaToScVal(metaCid),
              addressToScVal(owner),
            ),
          )
          .setTimeout(30)
          .build();

        const prepared = await server.prepareTransaction(tx);
        prepared.sign(signer);
        const sent = await server.sendTransaction(prepared);
        const txHash = sent.hash;
        const polled = await server.pollTransaction(txHash, {
          attempts: 10,
        });
        return mapPollStatus(txHash, polled);
      } catch {
        return {
          txHash: "",
          status: "FAILED",
          ledger: null,
          feeStroops: null,
          record: null,
          error: "rpc",
        };
      }
    },

    async poll(txHash: string): Promise<AnchorSubmitResult> {
      const polled = await server.pollTransaction(txHash, { attempts: 10 });
      return mapPollStatus(txHash, polled);
    },
  };
}

export function createVerifyOnlyClient(input: {
  rpc: rpc.Server;
  networkPassphrase: string;
  contractId: string;
}): Pick<AnchorClient, "verify"> {
  const { rpc: server, networkPassphrase, contractId } = input;
  return {
    verify: async (hashHex: string) => {
      const { result } = await server.queryContract(
        contractId,
        "verify",
        { hash: hashHex },
        networkPassphrase,
      );
      return mapQueryResult(result);
    },
  };
}
