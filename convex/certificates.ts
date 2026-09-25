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

export const getAnchorForCertificate = query({
  args: { certificateId: v.id("certificates") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anchors")
      .withIndex("by_certificate", (q) => q.eq("certificateId", args.certificateId))
      .unique();
  },
});
