import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import {
  getUserByClerkId,
  markUserDeletedRecord,
  provisionUserRecord,
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
  args: {
    clerkUserId: v.string(),
    email: v.union(v.string(), v.null()),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      clerkUserId: v.string(),
      email: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.clerkUserId) {
      return null;
    }
    await provisionUserRecord(ctx, args);
    const user = await getUserByClerkId(ctx, args.clerkUserId);
    if (!user) return null;
    return toAppUser(user);
  },
});

export const getAppUserByClerkId = query({
  args: { clerkUserId: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      clerkUserId: v.string(),
      email: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkUserId);
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

export const deleteFromWebhook = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await markUserDeletedRecord(ctx, args.clerkUserId);
    return null;
  },
});

export const recordWebhookEvent = internalMutation({
  args: {
    svixId: v.string(),
    eventType: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.svixId))
      .unique();
    if (existing) return false;
    await ctx.db.insert("webhookEvents", {
      externalId: args.svixId,
      eventType: args.eventType,
      receivedAt: Date.now(),
    });
    return true;
  },
});
