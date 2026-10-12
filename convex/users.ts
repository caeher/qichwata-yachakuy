import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import {
  getUserByClerkId,
  markUserDeletedRecord,
  provisionUserRecord,
  requireIdentity,
} from "./lib/auth";

export type AppUser = {
  id: string;
  clerkUserId: string;
  email: string | null;
};

function toAppUser(row: {
  _id: string;
  clerkUserId: string;
  email: string | null;
  deletedAt?: number;
}): AppUser | null {
  if (row.deletedAt) return null;
  return {
    id: row._id,
    clerkUserId: row.clerkUserId,
    email: row.email,
  };
}

export const resolveAppUser = mutation({
  args: {},
  returns: v.union(
    v.object({
      id: v.string(),
      clerkUserId: v.string(),
      email: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const clerkUserId = identity.subject;
    const email =
      identity.emailVerified === true ? (identity.email ?? null) : null;

    await provisionUserRecord(ctx, { clerkUserId, email });
    const user = await getUserByClerkId(ctx, clerkUserId);
    if (!user) return null;
    return toAppUser(user);
  },
});

export const getAppUserByClerkId = query({
  args: {},
  returns: v.union(
    v.object({
      id: v.string(),
      clerkUserId: v.string(),
      email: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) return null;
    return toAppUser(user);
  },
});

export const provisionFromWebhook = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await provisionUserRecord(ctx, args);
    return null;
  },
});

export const processWebhookEvent = internalMutation({
  args: {
    svixId: v.string(),
    eventType: v.string(),
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.svixId))
      .unique();
    if (existing?.processedAt !== undefined) return false;

    if (args.eventType === "user.created") {
      if (!args.clerkUserId) throw new Error("missing user id");
      await provisionUserRecord(ctx, {
        clerkUserId: args.clerkUserId,
        email: args.email ?? null,
      });
    } else if (args.eventType === "user.deleted") {
      if (!args.clerkUserId) throw new Error("missing user id");
      await markUserDeletedRecord(ctx, args.clerkUserId);
    }

    // Convex commits the effect and event marker in one transaction. If either
    // operation throws, neither change is committed and Svix can safely retry.
    if (existing) {
      await ctx.db.patch(existing._id, { processedAt: Date.now() });
    } else {
      await ctx.db.insert("webhookEvents", {
        externalId: args.svixId,
        eventType: args.eventType,
        receivedAt: Date.now(),
        processedAt: Date.now(),
      });
    }
    return true;
  },
});
