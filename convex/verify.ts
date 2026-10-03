import { v } from "convex/values";

import { query } from "./_generated/server";

export const lookupDocumentAnchor = query({
  args: { sha256: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_sha256", (q) => q.eq("sha256", args.sha256))
      .unique();
    if (!document || document.status !== "anchored" || document.deletedAt) {
      return null;
    }
    const anchor = await ctx.db
      .query("anchors")
      .withIndex("by_document", (q) => q.eq("documentId", document._id))
      .unique();
    if (!anchor) return null;
    return {
      network: anchor.network,
      txHash: anchor.txHash,
      ledger: anchor.ledger ?? null,
      contractId: anchor.contractId ?? null,
      anchoredAt: anchor.anchoredAt,
    };
  },
});
