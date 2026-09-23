import { and, eq } from "drizzle-orm";

import type { AuthDb } from "@/lib/auth/provision-user";
import {
  anchors,
  auditEvents,
  certificates,
  courseCompletions,
} from "@/db/schema";
import type { AnchorClient } from "@/lib/stellar/anchor-types";
import { stroopsToFeeXlm } from "@/lib/anchors/fee";
import { expertTxUrl } from "@/lib/anchors/expert-url";
import { recordAudit } from "@/lib/audit/record";

export type CertificateAnchorResult =
  | {
      status: "anchored";
      publicId: string;
      sha256: string;
      network: "testnet" | "mainnet";
      txHash: string;
    }
  | {
      status: "pending" | "failed";
      publicId: string;
      sha256: string;
      reason?: "configuration_required";
    };

type Runtime = {
  network: "testnet" | "mainnet";
  contractId: string;
  operatorPublicKey: string;
  chain: AnchorClient;
};

export async function runCertificateAnchorJob(
  db: AuthDb,
  runtime: Runtime | null,
  certificateId: string,
): Promise<CertificateAnchorResult | null> {
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.id, certificateId),
  });
  if (!cert) return null;
  if (cert.status === "anchored") {
    const receipt = await db.query.anchors.findFirst({
      where: eq(anchors.certificateId, cert.id),
    });
    return receipt
      ? {
          status: "anchored",
          publicId: cert.publicId,
          sha256: cert.sha256,
          network: receipt.network as "testnet" | "mainnet",
          txHash: receipt.txHash,
        }
      : { status: "pending", publicId: cert.publicId, sha256: cert.sha256 };
  }
  if (!runtime)
    return {
      status: "pending",
      publicId: cert.publicId,
      sha256: cert.sha256,
      reason: "configuration_required",
    };

  const reservation = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(certificates)
      .where(eq(certificates.id, cert.id))
      .for("update");
    const row = locked[0];
    if (!row || row.status === "anchored") return { kind: "done" as const };
    const completion = await tx.query.courseCompletions.findFirst({
      where: and(
        eq(courseCompletions.id, row.completionId),
        eq(courseCompletions.eligible, true),
      ),
    });
    if (!completion) return { kind: "ineligible" as const };
    if (row.status === "failed") {
      await tx
        .update(certificates)
        .set({ status: "pending", pendingTxHash: null, pendingAt: new Date() })
        .where(eq(certificates.id, row.id));
      return {
        kind: "submit" as const,
        sha256: row.sha256,
        publicId: row.publicId,
      };
    }
    if (row.pendingTxHash)
      return {
        kind: "poll" as const,
        txHash: row.pendingTxHash,
        sha256: row.sha256,
        publicId: row.publicId,
      };
    if (row.pendingAt && Date.now() - row.pendingAt.getTime() < 120_000)
      return {
        kind: "busy" as const,
        sha256: row.sha256,
        publicId: row.publicId,
      };
    await tx
      .update(certificates)
      .set({ status: "pending", pendingAt: new Date() })
      .where(eq(certificates.id, row.id));
    return {
      kind: "submit" as const,
      sha256: row.sha256,
      publicId: row.publicId,
    };
  });

  if (reservation.kind === "ineligible")
    return { status: "failed", publicId: cert.publicId, sha256: cert.sha256 };
  if (reservation.kind === "busy" || reservation.kind === "done")
    return { status: "pending", publicId: cert.publicId, sha256: cert.sha256 };
  const metadata = `cert:${reservation.publicId}`;
  const persistReceipt = async (input: {
    txHash: string;
    ledger: number | null;
    fee: string | null;
  }) => {
    const onChain = await runtime.chain.verify(reservation.sha256);
    if (
      !onChain ||
      onChain.metaCid !== metadata ||
      onChain.owner !== runtime.operatorPublicKey
    ) {
      throw new Error("certificate_chain_evidence_mismatch");
    }
    await db.transaction(async (tx) => {
      const exists = await tx.query.anchors.findFirst({
        where: eq(anchors.certificateId, cert.id),
      });
      if (exists) return;
      await tx.insert(anchors).values({
        certificateId: cert.id,
        network: runtime.network,
        txHash: input.txHash,
        ownerPublicKey: runtime.operatorPublicKey,
        ledger: input.ledger ?? onChain.ledger,
        contractId: runtime.contractId,
        feeXlm: input.fee,
      });
      await tx
        .update(certificates)
        .set({ status: "anchored", pendingTxHash: null, pendingAt: null })
        .where(eq(certificates.id, cert.id));
      await tx.insert(auditEvents).values({
        userId: cert.userId,
        action: "certificate_anchor_settled",
        certificateId: cert.id,
        meta: { network: runtime.network, txHash: input.txHash },
      });
    });
  };

  if (reservation.kind === "poll") {
    const polled = await runtime.chain.poll(reservation.txHash);
    if (polled.status === "SUCCESS") {
      await persistReceipt({
        txHash: polled.txHash,
        ledger: polled.ledger,
        fee: stroopsToFeeXlm(polled.feeStroops),
      });
      return {
        status: "anchored",
        publicId: reservation.publicId,
        sha256: reservation.sha256,
        network: runtime.network,
        txHash: polled.txHash,
      };
    }
    if (polled.status === "FAILED") {
      await db
        .update(certificates)
        .set({ status: "failed", pendingAt: null, pendingTxHash: null })
        .where(eq(certificates.id, cert.id));
      await recordAudit(db, {
        userId: cert.userId,
        action: "certificate_anchor_failed",
        certificateId: cert.id,
      });
      return {
        status: "failed",
        publicId: reservation.publicId,
        sha256: reservation.sha256,
      };
    }
    return {
      status: "pending",
      publicId: reservation.publicId,
      sha256: reservation.sha256,
    };
  }

  // Reconcile before a retry. Matching hash alone is insufficient: owner and
  // opaque metadata must also identify this issuer and certificate.
  const existing = await runtime.chain.verify(reservation.sha256);
  if (existing) {
    if (
      existing.metaCid !== metadata ||
      existing.owner !== runtime.operatorPublicKey
    ) {
      await db
        .update(certificates)
        .set({ status: "failed", pendingAt: null })
        .where(eq(certificates.id, cert.id));
      return {
        status: "failed",
        publicId: reservation.publicId,
        sha256: reservation.sha256,
      };
    }
    const knownTx = cert.pendingTxHash;
    if (knownTx) {
      await persistReceipt({
        txHash: knownTx,
        ledger: existing.ledger,
        fee: null,
      });
      return {
        status: "anchored",
        publicId: reservation.publicId,
        sha256: reservation.sha256,
        network: runtime.network,
        txHash: knownTx,
      };
    }
    // Soroban's verify entrypoint does not return the originating transaction.
    // Keep the job recoverable and never fabricate a receipt.
    await db.insert(auditEvents).values({
      userId: cert.userId,
      action: "certificate_reconcile",
      certificateId: cert.id,
      meta: { network: runtime.network, sha256: cert.sha256 },
    });
    return {
      status: "pending",
      publicId: reservation.publicId,
      sha256: reservation.sha256,
    };
  }

  await recordAudit(db, {
    userId: cert.userId,
    action: "certificate_anchor_submit",
    certificateId: cert.id,
    meta: { network: runtime.network, sha256: cert.sha256 },
  });
  const submitted = await runtime.chain.submitAnchor({
    hashHex: reservation.sha256,
    metaCid: metadata,
    owner: runtime.operatorPublicKey,
    onSubmitted: async (txHash) => {
      await db
        .update(certificates)
        .set({
          pendingTxHash: txHash,
          pendingAt: new Date(),
          status: "pending",
        })
        .where(eq(certificates.id, cert.id));
    },
  });
  if (submitted.txHash) {
    await db
      .update(certificates)
      .set({
        pendingTxHash: submitted.txHash,
        pendingAt: new Date(),
        status: "pending",
      })
      .where(eq(certificates.id, cert.id));
  }
  if (submitted.status === "SUCCESS") {
    await persistReceipt({
      txHash: submitted.txHash,
      ledger: submitted.ledger,
      fee: stroopsToFeeXlm(submitted.feeStroops),
    });
    return {
      status: "anchored",
      publicId: reservation.publicId,
      sha256: reservation.sha256,
      network: runtime.network,
      txHash: submitted.txHash,
    };
  }
  if (submitted.status === "FAILED") {
    await db
      .update(certificates)
      .set({ status: "failed", pendingAt: null })
      .where(eq(certificates.id, cert.id));
    await recordAudit(db, {
      userId: cert.userId,
      action: "certificate_anchor_failed",
      certificateId: cert.id,
      meta: { network: runtime.network },
    });
    return {
      status: "failed",
      publicId: reservation.publicId,
      sha256: cert.sha256,
    };
  }
  return {
    status: "pending",
    publicId: reservation.publicId,
    sha256: cert.sha256,
  };
}

export function certificateExplorerUrl(
  network: "testnet" | "mainnet",
  txHash: string,
) {
  return expertTxUrl(network, txHash);
}
