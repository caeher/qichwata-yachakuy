import { eq } from "drizzle-orm";

import {
  AnchorQuotaExceededError,
  DocumentNotFoundError,
  failAnchor,
  HashAlreadyAnchoredError,
  reserveAnchor,
  resetDocumentToDraft,
  settleAnchor,
  setPendingTxHash,
} from "@/db/anchor-quota";
import { documents } from "@/db/schema";
import type { AuthDb } from "@/lib/auth/provision-user";
import { loadDocumentDetail } from "@/lib/anchors/document-detail";
import { stroopsToFeeXlm } from "@/lib/anchors/fee";
import { logAnchor } from "@/lib/anchors/log";
import { recordAudit } from "@/lib/audit/record";
import type { DocumentDetail } from "@/lib/anchors/document-detail";
import type { AnchorJobResult } from "@/lib/anchors/types";
import type { AnchorClient } from "@/lib/stellar/anchor-types";

const POLL_MS = 20_000;

async function pollWithBudget(
  chain: AnchorClient,
  txHash: string,
): Promise<ReturnType<AnchorClient["poll"]>> {
  const deadline = Date.now() + POLL_MS;
  let last = await chain.poll(txHash);
  while (last.status === "PENDING" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    last = await chain.poll(txHash);
  }
  return last;
}

export async function runAnchorJob(
  db: AuthDb,
  chain: AnchorClient,
  input: {
    userId: string;
    documentId: string;
    network: "testnet" | "mainnet";
    contractId: string;
    operatorPublicKey: string;
  },
): Promise<AnchorJobResult> {
  const metaCid = `doc:${input.documentId}`;

  let reserve;
  try {
    reserve = await reserveAnchor(db, {
      userId: input.userId,
      documentId: input.documentId,
    });
  } catch (error) {
    if (error instanceof AnchorQuotaExceededError) {
      logAnchor("anchor_quota", {
        userId: input.userId,
        documentId: input.documentId,
        included: error.included,
        used: error.used,
      });
      await recordAudit(db, {
        userId: input.userId,
        action: "anchor_quota",
        documentId: input.documentId,
        meta: { included: error.included, used: error.used },
      });
      return {
        error: "anchor_quota_exceeded",
        included: error.included,
        used: error.used,
      };
    }
    if (error instanceof DocumentNotFoundError) {
      return { error: "not_found" };
    }
    throw error;
  }

  const requireDetail = async (): Promise<
    DocumentDetail | { error: "not_found" }
  > => {
    const detail = await loadDocumentDetail(db, input.userId, input.documentId);
    if (!detail) {
      return { error: "not_found" };
    }
    return detail;
  };

  if (reserve.kind === "already") {
    const detail = await requireDetail();
    if ("error" in detail) {
      return detail;
    }
    return { status: "anchored", detail };
  }

  if (reserve.kind === "in_progress") {
    const detail = await requireDetail();
    if ("error" in detail) {
      return detail;
    }
    return { status: "pending", detail };
  }

  if (reserve.kind === "poll") {
    const polled = await pollWithBudget(chain, reserve.txHash);
    if (polled.status === "SUCCESS" && polled.record) {
      await settleAnchor(db, {
        userId: input.userId,
        documentId: input.documentId,
        sha256: reserve.sha256,
        network: input.network,
        txHash: polled.txHash,
        ledger: polled.ledger,
        contractId: input.contractId,
        feeXlm: stroopsToFeeXlm(polled.feeStroops),
      });
      logAnchor("anchor_settled", {
        documentId: input.documentId,
        txHash: polled.txHash,
        network: input.network,
      });
      await recordAudit(db, {
        userId: input.userId,
        action: "anchor_settled",
        documentId: input.documentId,
        meta: { txHash: polled.txHash, network: input.network },
      });
      const detail = await requireDetail();
      if ("error" in detail) {
        return detail;
      }
      return { status: "anchored", detail };
    }
    if (polled.status === "FAILED") {
      await failAnchor(db, input.documentId);
      const detail = await requireDetail();
      if ("error" in detail) {
        return detail;
      }
      return { status: "failed", detail };
    }
    const detail = await requireDetail();
    if ("error" in detail) {
      return detail;
    }
    return { status: "pending", detail };
  }

  const sha256 = reserve.sha256;
  const onChain = await chain.verify(sha256);
  if (onChain) {
    if (onChain.metaCid === metaCid) {
      if (reserve.kind === "submit") {
        const doc = await db.query.documents.findFirst({
          where: eq(documents.id, input.documentId),
        });
        const txHash = doc?.pendingTxHash;
        if (txHash) {
          await settleAnchor(db, {
            userId: input.userId,
            documentId: input.documentId,
            sha256,
            network: input.network,
            txHash,
            ledger: onChain.ledger,
            contractId: input.contractId,
            feeXlm: null,
          });
          const detail = await requireDetail();
          if ("error" in detail) {
            return detail;
          }
          return { status: "anchored", detail };
        }
        logAnchor("anchor_reconcile_missing_tx", {
          documentId: input.documentId,
          sha256,
        });
        await recordAudit(db, {
          userId: input.userId,
          action: "anchor_reconcile_missing_tx",
          documentId: input.documentId,
          meta: { sha256 },
        });
        const detail = await requireDetail();
        if ("error" in detail) {
          return detail;
        }
        return {
          status: "pending",
          detail,
          warning: "chain_has_record",
        };
      }
    } else {
      await resetDocumentToDraft(db, input.documentId);
      return { error: "hash_already_anchored", sha256 };
    }
  }

  logAnchor("anchor_submit", {
    documentId: input.documentId,
    sha256,
    network: input.network,
  });
  await recordAudit(db, {
    userId: input.userId,
    action: "anchor_submit",
    documentId: input.documentId,
    meta: { sha256, network: input.network },
  });

  const submitted = await chain.submitAnchor({
    hashHex: sha256,
    metaCid,
    owner: input.operatorPublicKey,
  });

  if (submitted.txHash) {
    await setPendingTxHash(db, input.documentId, submitted.txHash);
  }

  const polled =
    submitted.status === "PENDING" && submitted.txHash
      ? await pollWithBudget(chain, submitted.txHash)
      : submitted;

  if (polled.status === "SUCCESS") {
    try {
      await settleAnchor(db, {
        userId: input.userId,
        documentId: input.documentId,
        sha256,
        network: input.network,
        txHash: polled.txHash,
        ledger: polled.ledger,
        contractId: input.contractId,
        feeXlm: stroopsToFeeXlm(polled.feeStroops),
      });
    } catch (error) {
      if (error instanceof HashAlreadyAnchoredError) {
        await resetDocumentToDraft(db, input.documentId);
        return { error: "hash_already_anchored", sha256: error.sha256 };
      }
      throw error;
    }
    logAnchor("anchor_settled", {
      documentId: input.documentId,
      txHash: polled.txHash,
      network: input.network,
    });
    await recordAudit(db, {
      userId: input.userId,
      action: "anchor_settled",
      documentId: input.documentId,
      meta: { txHash: polled.txHash, network: input.network },
    });
    const detail = await requireDetail();
    if ("error" in detail) {
      return detail;
    }
    return { status: "anchored", detail };
  }

  if (polled.status === "FAILED" || polled.error === "already_anchored") {
    const retry = await chain.verify(sha256);
    if (retry?.metaCid === metaCid && polled.txHash) {
      await settleAnchor(db, {
        userId: input.userId,
        documentId: input.documentId,
        sha256,
        network: input.network,
        txHash: polled.txHash,
        ledger: retry.ledger,
        contractId: input.contractId,
        feeXlm: stroopsToFeeXlm(polled.feeStroops),
      });
      const detail = await requireDetail();
      if ("error" in detail) {
        return detail;
      }
      return { status: "anchored", detail };
    }
    if (retry && retry.metaCid !== metaCid) {
      await resetDocumentToDraft(db, input.documentId);
      return { error: "hash_already_anchored", sha256 };
    }
    await failAnchor(db, input.documentId);
    logAnchor("anchor_failed", {
      documentId: input.documentId,
      sha256,
    });
    await recordAudit(db, {
      userId: input.userId,
      action: "anchor_failed",
      documentId: input.documentId,
      meta: { sha256 },
    });
    return { error: "anchor_failed" };
  }

  const detail = await requireDetail();
  if ("error" in detail) {
    return detail;
  }
  return { status: "pending", detail };
}
