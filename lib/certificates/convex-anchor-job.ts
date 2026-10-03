import type { Id } from "@/convex/_generated/dataModel";
import { internal } from "@/convex/_generated/api";
import { convexInternalMutation } from "@/lib/convex/server";
import type { AnchorRuntimeConfig } from "@/lib/anchors/service";
import { stroopsToFeeXlm } from "@/lib/anchors/fee";

type Runtime = Extract<AnchorRuntimeConfig, { configured: true }>;

type Reservation =
  | { kind: "done" }
  | { kind: "ineligible" }
  | { kind: "busy"; publicId: string; sha256: string }
  | {
      kind: "poll";
      certificateId: unknown;
      publicId: string;
      sha256: string;
      txHash: string;
    }
  | {
      kind: "submit";
      certificateId: unknown;
      publicId: string;
      sha256: string;
    };

export async function runConvexCertificateAnchorJob(
  runtime: Runtime | null,
  certificateId: Id<"certificates">,
) {
  const reservation = (await convexInternalMutation(
    internal.certificates.reserveForWorker,
    { certificateId },
  )) as Reservation;
  if (reservation.kind === "done" || reservation.kind === "ineligible") {
    return {
      status: reservation.kind === "done" ? "pending" : "failed",
    } as const;
  }
  if (reservation.kind === "busy") return { status: "pending" } as const;
  if (!runtime)
    return { status: "pending", reason: "configuration_required" } as const;

  const metadata = `cert:${reservation.publicId}`;
  const settle = async (input: {
    txHash: string;
    ledger: number | null;
    feeXlm: string | null;
  }) => {
    const evidence = await runtime.chain.verify(reservation.sha256);
    if (
      !evidence ||
      evidence.metaCid !== metadata ||
      evidence.owner !== runtime.operatorPublicKey
    ) {
      throw new Error("certificate_chain_evidence_mismatch");
    }
    await convexInternalMutation(internal.certificates.settleWorkerAnchor, {
      certificateId,
      network: runtime.network,
      contractId: runtime.contractId,
      ownerPublicKey: runtime.operatorPublicKey,
      txHash: input.txHash,
      ledger: input.ledger ?? evidence.ledger,
      feeXlm: input.feeXlm,
    });
    return {
      status: "anchored" as const,
      publicId: reservation.publicId,
      sha256: reservation.sha256,
      network: runtime.network,
      txHash: input.txHash,
    };
  };

  if (reservation.kind === "poll") {
    const polled = await runtime.chain.poll(reservation.txHash);
    if (polled.status === "SUCCESS") {
      return settle({
        txHash: polled.txHash,
        ledger: polled.ledger,
        feeXlm: stroopsToFeeXlm(polled.feeStroops),
      });
    }
    if (polled.status === "FAILED") {
      await convexInternalMutation(internal.certificates.failWorkerAttempt, {
        certificateId,
      });
      return { status: "failed" as const, publicId: reservation.publicId };
    }
    return { status: "pending" as const, publicId: reservation.publicId };
  }

  const existing = await runtime.chain.verify(reservation.sha256);
  if (existing) {
    if (
      existing.metaCid !== metadata ||
      existing.owner !== runtime.operatorPublicKey
    ) {
      await convexInternalMutation(internal.certificates.failWorkerAttempt, {
        certificateId,
      });
      return { status: "failed" as const, publicId: reservation.publicId };
    }
    // Soroban verification does not expose the original transaction hash.
    // Keep the intent pending rather than inventing a receipt.
    return { status: "pending" as const, publicId: reservation.publicId };
  }

  const submitted = await runtime.chain.submitAnchor({
    hashHex: reservation.sha256,
    metaCid: metadata,
    owner: runtime.operatorPublicKey,
    onSubmitted: async (txHash) => {
      await convexInternalMutation(internal.certificates.saveWorkerTxHash, {
        certificateId,
        txHash,
      });
    },
  });
  if (submitted.status === "FAILED") {
    await convexInternalMutation(internal.certificates.failWorkerAttempt, {
      certificateId,
    });
    return { status: "failed" as const, publicId: reservation.publicId };
  }
  if (submitted.status === "SUCCESS") {
    return settle({
      txHash: submitted.txHash,
      ledger: submitted.ledger,
      feeXlm: stroopsToFeeXlm(submitted.feeStroops),
    });
  }
  return { status: "pending" as const, publicId: reservation.publicId };
}
