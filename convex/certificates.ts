import { v } from "convex/values";

import {
  canonicalCertificateJson,
  hashCertificatePayload,
} from "./lib/certificateCanonical";

import { internalMutation, internalQuery, query } from "./_generated/server";
import { getUserByClerkId, requireIdentity } from "./lib/auth";

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
  ) {
    return null;
  }
  const completedAt = new Date(snapshot.completion.completedAt);
  const issuedAt = new Date(snapshot.issuedAt);
  if (Number.isNaN(completedAt.getTime()) || Number.isNaN(issuedAt.getTime())) {
    return null;
  }
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

export const listForUser = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user._id !== args.userId) {
      return [];
    }
    return await ctx.db
      .query("certificates")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (!cert) return null;
    const normalized = canonicalFromSnapshot(cert.snapshot);
    const digest = normalized
      ? await hashCertificatePayload(normalized.canonical)
      : null;
    if (!normalized || digest !== cert.sha256) {
      return {
        publicId: cert.publicId,
        sha256: cert.sha256,
        state: "integrity_mismatch" as const,
      };
    }
    const receipt = await ctx.db
      .query("anchors")
      .withIndex("by_certificate", (q) => q.eq("certificateId", cert._id))
      .unique();
    return {
      publicId: cert.publicId,
      sha256: cert.sha256,
      state: cert.status,
      issuer: normalized.snapshot.issuer,
      courseTitle: normalized.snapshot.course.title,
      issuedAt: normalized.snapshot.issuedAt,
      network: receipt?.network ?? null,
      txHash: receipt?.txHash ?? null,
      beneficiaryRef: normalized.snapshot.beneficiaryRef,
    };
  },
});

export const getBySha256 = query({
  args: { sha256: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_sha256", (q) => q.eq("sha256", args.sha256))
      .unique();
  },
});

export const listPendingForWorker = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("certificates")
      .withIndex("by_status_pending", (q) => q.eq("status", "pending"))
      .take(args.limit);
    const failed = await ctx.db
      .query("certificates")
      .withIndex("by_status_pending", (q) => q.eq("status", "failed"))
      .take(args.limit);
    return [...pending, ...failed].slice(0, args.limit);
  },
});

export const reserveForWorker = internalMutation({
  args: { certificateId: v.id("certificates") },
  returns: v.any(),
  handler: async (ctx, { certificateId }) => {
    const cert = await ctx.db.get(certificateId);
    if (!cert) return { kind: "done" };
    if (cert.status === "anchored") return { kind: "done" };
    const completion = await ctx.db.get(cert.completionId);
    if (!completion?.eligible) return { kind: "ineligible" };
    if (cert.pendingTxHash) {
      return {
        kind: "poll",
        certificateId,
        publicId: cert.publicId,
        sha256: cert.sha256,
        txHash: cert.pendingTxHash,
      };
    }
    if (
      cert.status === "pending" &&
      cert.pendingAt &&
      Date.now() - cert.pendingAt < 120_000
    ) {
      return { kind: "busy", publicId: cert.publicId, sha256: cert.sha256 };
    }
    await ctx.db.patch(certificateId, {
      status: "pending",
      pendingAt: Date.now(),
    });
    return {
      kind: "submit",
      certificateId,
      publicId: cert.publicId,
      sha256: cert.sha256,
    };
  },
});

export const saveWorkerTxHash = internalMutation({
  args: { certificateId: v.id("certificates"), txHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { certificateId, txHash }) => {
    const cert = await ctx.db.get(certificateId);
    if (!cert || cert.status === "anchored") return null;
    await ctx.db.patch(certificateId, {
      status: "pending",
      pendingTxHash: txHash,
      pendingAt: Date.now(),
    });
    return null;
  },
});

export const failWorkerAttempt = internalMutation({
  args: { certificateId: v.id("certificates") },
  returns: v.null(),
  handler: async (ctx, { certificateId }) => {
    const cert = await ctx.db.get(certificateId);
    if (!cert || cert.status === "anchored") return null;
    await ctx.db.patch(certificateId, {
      status: "failed",
      pendingAt: undefined,
      pendingTxHash: undefined,
    });
    await ctx.db.insert("auditEvents", {
      userId: cert.userId,
      action: "certificate_anchor_failed",
      certificateId,
      meta: {},
      createdAt: Date.now(),
    });
    return null;
  },
});

export const settleWorkerAnchor = internalMutation({
  args: {
    certificateId: v.id("certificates"),
    network: v.union(v.literal("testnet"), v.literal("mainnet")),
    contractId: v.string(),
    ownerPublicKey: v.string(),
    txHash: v.string(),
    ledger: v.union(v.number(), v.null()),
    feeXlm: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certificateId);
    if (!cert) throw new Error("certificate_not_found");
    const completion = await ctx.db.get(cert.completionId);
    if (!completion?.eligible) throw new Error("certificate_ineligible");
    const existing = await ctx.db
      .query("anchors")
      .withIndex("by_certificate", (q) => q.eq("certificateId", cert._id))
      .unique();
    if (!existing) {
      await ctx.db.insert("anchors", {
        certificateId: cert._id,
        network: args.network,
        txHash: args.txHash,
        ownerPublicKey: args.ownerPublicKey,
        ledger: args.ledger ?? undefined,
        contractId: args.contractId,
        anchoredAt: Date.now(),
        feeXlm: args.feeXlm ?? undefined,
      });
    }
    await ctx.db.patch(cert._id, {
      status: "anchored",
      pendingTxHash: undefined,
      pendingAt: undefined,
    });
    await ctx.db.insert("auditEvents", {
      userId: cert.userId,
      action: "certificate_anchor_settled",
      certificateId: cert._id,
      meta: { network: args.network, txHash: args.txHash },
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getAnchorForCertificate = query({
  args: { certificateId: v.id("certificates") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anchors")
      .withIndex("by_certificate", (q) =>
        q.eq("certificateId", args.certificateId),
      )
      .unique();
  },
});
