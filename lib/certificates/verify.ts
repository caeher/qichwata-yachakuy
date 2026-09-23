import { and, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { anchors, certificates } from "@/db/schema";
import {
  canonicalCertificateJson,
  hashCertificatePayload,
} from "@/lib/certificates/canonical";
import { expertTxUrl } from "@/lib/anchors/expert-url";
import type { ChainLookupResult } from "@/lib/verify/lookup";

type Db = Database | TestDatabase;

export type CertificateVerification =
  | { status: "unknown"; sha256: string }
  | {
      status: "pending" | "failed" | "integrity_mismatch" | "chain_unavailable";
      publicId: string;
      sha256: string;
    }
  | {
      status: "anchored";
      publicId: string;
      sha256: string;
      network: "testnet" | "mainnet";
      txHash: string;
      ledger: number | null;
      expertUrl: string | null;
      onChain: true;
      issuer: string;
      courseTitle: string;
      issuedAt: string;
    };

type Snapshot = {
  schemaVersion: 1;
  certificateId: string;
  beneficiaryRef: string;
  issuer: string;
  course: { slug: string; version: string; title: string };
  completion: { policyVersion: string; completedAt: string };
  issuedAt: string;
};

function canonicalFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<Snapshot>;
  if (
    snapshot.schemaVersion !== 1 ||
    typeof snapshot.certificateId !== "string" ||
    typeof snapshot.beneficiaryRef !== "string" ||
    typeof snapshot.issuer !== "string" ||
    !snapshot.course ||
    typeof snapshot.course.slug !== "string" ||
    typeof snapshot.course.version !== "string" ||
    typeof snapshot.course.title !== "string" ||
    !snapshot.completion ||
    typeof snapshot.completion.policyVersion !== "string" ||
    typeof snapshot.completion.completedAt !== "string" ||
    typeof snapshot.issuedAt !== "string"
  )
    return null;
  const completedAt = new Date(snapshot.completion.completedAt);
  const issuedAt = new Date(snapshot.issuedAt);
  if (Number.isNaN(completedAt.getTime()) || Number.isNaN(issuedAt.getTime()))
    return null;
  return {
    snapshot: snapshot as Snapshot,
    canonical: canonicalCertificateJson({
      certificateId: snapshot.certificateId,
      beneficiaryRef: snapshot.beneficiaryRef,
      issuer: snapshot.issuer,
      course: snapshot.course,
      policyVersion: snapshot.completion.policyVersion,
      completedAt,
      issuedAt,
    }),
  };
}

export async function verifyCertificateByHash(
  db: Db,
  chain: (hash: string) => Promise<ChainLookupResult>,
  sha256: string,
  expected: {
    network: "testnet" | "mainnet";
    contractId: string | null;
  },
): Promise<CertificateVerification> {
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.sha256, sha256),
  });
  if (!cert) return { status: "unknown", sha256 };
  const normalized = canonicalFromSnapshot(cert.snapshot);
  if (
    !normalized ||
    hashCertificatePayload(normalized.canonical) !== cert.sha256 ||
    cert.schemaVersion !== 1
  ) {
    return {
      status: "integrity_mismatch",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  }
  if (cert.status === "failed")
    return { status: "failed", publicId: cert.publicId, sha256: cert.sha256 };
  if (cert.status !== "anchored")
    return { status: "pending", publicId: cert.publicId, sha256: cert.sha256 };

  const receipt = await db.query.anchors.findFirst({
    where: eq(anchors.certificateId, cert.id),
  });
  if (!receipt)
    return {
      status: "integrity_mismatch",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  let result: ChainLookupResult;
  try {
    result = await chain(cert.sha256);
  } catch {
    return {
      status: "chain_unavailable",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  }
  if (!result.configured)
    return {
      status: "chain_unavailable",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  if (!result.record)
    return {
      status: "integrity_mismatch",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  if (
    receipt.network !== expected.network ||
    receipt.contractId !== expected.contractId ||
    result.record.metaCid !== `cert:${cert.publicId}` ||
    result.record.owner !== receipt.ownerPublicKey
  )
    return {
      status: "integrity_mismatch",
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  return {
    status: "anchored",
    publicId: cert.publicId,
    sha256: cert.sha256,
    network: receipt.network as "testnet" | "mainnet",
    txHash: receipt.txHash,
    ledger: receipt.ledger ?? result.record.ledger,
    expertUrl: expertTxUrl(
      receipt.network as "testnet" | "mainnet",
      receipt.txHash,
    ),
    onChain: true,
    issuer: normalized.snapshot.issuer,
    courseTitle: normalized.snapshot.course.title,
    issuedAt: normalized.snapshot.issuedAt,
  };
}

export async function getPublicCertificate(db: Db, publicId: string) {
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.publicId, publicId),
  });
  if (!cert) return null;
  const normalized = canonicalFromSnapshot(cert.snapshot);
  if (
    !normalized ||
    hashCertificatePayload(normalized.canonical) !== cert.sha256
  ) {
    return {
      publicId: cert.publicId,
      sha256: cert.sha256,
      state: "integrity_mismatch" as const,
    };
  }
  const receipt = await db.query.anchors.findFirst({
    where: and(eq(anchors.certificateId, cert.id)),
  });
  return {
    publicId: cert.publicId,
    sha256: cert.sha256,
    state: cert.status,
    issuer: normalized.snapshot.issuer,
    courseTitle: normalized.snapshot.course.title,
    issuedAt: normalized.snapshot.issuedAt,
    network: receipt?.network ?? null,
    txHash: receipt?.txHash ?? null,
    expertUrl: receipt
      ? expertTxUrl(receipt.network as "testnet" | "mainnet", receipt.txHash)
      : null,
    // The only beneficiary field is an opaque certificate-specific reference.
    beneficiaryRef: normalized.snapshot.beneficiaryRef,
  };
}
