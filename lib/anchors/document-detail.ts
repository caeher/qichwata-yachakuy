import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { anchors, documents } from "@/db/schema";
import { expertTxUrl } from "@/lib/anchors/expert-url";

type Db = Database | TestDatabase;

export type DocumentDetail = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "draft" | "pending" | "anchored" | "failed";
  createdAt: string;
  anchor: null | {
    network: "testnet" | "mainnet";
    txHash: string;
    ledger: number | null;
    contractId: string | null;
    anchoredAt: string;
    feeXlm: string | null;
    expertUrl: string;
  };
};

export async function loadDocumentDetail(
  db: Db,
  userId: string,
  documentId: string,
): Promise<DocumentDetail | null> {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.userId, userId),
      isNull(documents.deletedAt),
    ),
  });
  if (!doc) {
    return null;
  }

  const anchorRow = await db.query.anchors.findFirst({
    where: eq(anchors.documentId, documentId),
  });

  let anchor: DocumentDetail["anchor"] = null;
  if (anchorRow) {
    const expertUrl =
      expertTxUrl(
        anchorRow.network as "testnet" | "mainnet",
        anchorRow.txHash,
      ) ?? "";
    anchor = {
      network: anchorRow.network as "testnet" | "mainnet",
      txHash: anchorRow.txHash,
      ledger: anchorRow.ledger,
      contractId: anchorRow.contractId,
      anchoredAt: anchorRow.anchoredAt.toISOString(),
      feeXlm: anchorRow.feeXlm,
      expertUrl,
    };
  }

  return {
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256,
    status: doc.status as DocumentDetail["status"],
    createdAt: doc.createdAt.toISOString(),
    anchor,
  };
}
