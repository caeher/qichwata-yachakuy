import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { anchors, documents } from "@/db/schema";
import { expertTxUrl } from "@/lib/anchors/expert-url";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

type Db = Database | TestDatabase;

export type ChainLookupResult =
  | { configured: false }
  | { configured: true; record: null }
  | {
      configured: true;
      record: {
        owner: string;
        metaCid: string;
        ledger: number;
        timestamp: number;
      };
    };

export class ChainUnavailableError extends Error {
  constructor() {
    super("chain_unavailable");
    this.name = "ChainUnavailableError";
  }
}

export type VerifyResult =
  | {
      status: "anchored";
      sha256: string;
      network: "testnet" | "mainnet";
      txHash: string | null;
      ledger: number | null;
      anchoredAt: string | null;
      contractId: string | null;
      owner: string | null;
      expertUrl: string | null;
      onChain: boolean | null;
      source: "database" | "chain" | "both";
    }
  | { status: "not_found"; sha256: string };

export async function lookupAnchor(
  db: Db,
  chain: (hash: string) => Promise<ChainLookupResult>,
  sha256: string,
  contractId: string | null,
  expectedNetwork: "testnet" | "mainnet" = resolveStellarEndpoints().network,
): Promise<VerifyResult> {
  const rows = await db
    .select({
      network: anchors.network,
      txHash: anchors.txHash,
      ledger: anchors.ledger,
      contractId: anchors.contractId,
      anchoredAt: anchors.anchoredAt,
    })
    .from(anchors)
    .innerJoin(documents, eq(anchors.documentId, documents.id))
    .where(and(eq(documents.sha256, sha256), eq(documents.status, "anchored")))
    .orderBy(asc(anchors.anchoredAt))
    .limit(1);

  const dbRow = rows[0];

  let chainResult: ChainLookupResult;
  try {
    chainResult = await chain(sha256);
  } catch {
    if (dbRow) {
      return buildDatabaseResult(sha256, dbRow, null);
    }
    throw new ChainUnavailableError();
  }

  if (!chainResult.configured) {
    if (dbRow) {
      return buildDatabaseResult(sha256, dbRow, null);
    }
    return { status: "not_found", sha256 };
  }

  if (chainResult.record && dbRow) {
    const expert = expertTxUrl(
      dbRow.network as "testnet" | "mainnet",
      dbRow.txHash,
    );
    return {
      status: "anchored",
      sha256,
      network: dbRow.network as "testnet" | "mainnet",
      txHash: dbRow.txHash,
      ledger: dbRow.ledger ?? chainResult.record.ledger,
      anchoredAt: dbRow.anchoredAt.toISOString(),
      contractId: dbRow.contractId ?? contractId,
      owner: chainResult.record.owner,
      expertUrl: expert,
      onChain: true,
      source: "both",
    };
  }

  if (dbRow) {
    return buildDatabaseResult(sha256, dbRow, false);
  }

  if (chainResult.record) {
    return {
      status: "anchored",
      sha256,
      network: expectedNetwork,
      txHash: null,
      ledger: chainResult.record.ledger,
      anchoredAt: new Date(chainResult.record.timestamp * 1000).toISOString(),
      contractId,
      owner: chainResult.record.owner,
      expertUrl: null,
      onChain: true,
      source: "chain",
    };
  }

  return { status: "not_found", sha256 };
}

function buildDatabaseResult(
  sha256: string,
  dbRow: {
    network: string;
    txHash: string;
    ledger: number | null;
    contractId: string | null;
    anchoredAt: Date;
  },
  onChain: boolean | null,
): VerifyResult {
  const network = dbRow.network as "testnet" | "mainnet";
  return {
    status: "anchored",
    sha256,
    network,
    txHash: dbRow.txHash,
    ledger: dbRow.ledger,
    anchoredAt: dbRow.anchoredAt.toISOString(),
    contractId: dbRow.contractId,
    owner: null,
    expertUrl: expertTxUrl(network, dbRow.txHash),
    onChain,
    source: "database",
  };
}
