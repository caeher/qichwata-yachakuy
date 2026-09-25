import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getIdentity(ctx: QueryCtx | MutationCtx) {
  return await ctx.auth.getUserIdentity();
}

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await getIdentity(ctx);
  if (!identity) {
    throw new ConvexError("not_authenticated");
  }
  return identity;
}

export async function getUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkUserId: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

export async function provisionUserRecord(
  ctx: MutationCtx,
  input: { clerkUserId: string; email: string | null },
): Promise<{ userId: string }> {
  const existing = await getUserByClerkId(ctx, input.clerkUserId);
  if (existing) {
    if (!existing.deletedAt && input.email !== existing.email) {
      await ctx.db.patch(existing._id, { email: input.email });
    }
    return { userId: existing._id };
  }
  const userId = await ctx.db.insert("users", {
    clerkUserId: input.clerkUserId,
    email: input.email,
    createdAt: Date.now(),
  });
  return { userId };
}

export async function markUserDeletedRecord(
  ctx: MutationCtx,
  clerkUserId: string,
) {
  const user = await getUserByClerkId(ctx, clerkUserId);
  if (!user || user.deletedAt) return;
  await ctx.db.patch(user._id, { deletedAt: Date.now(), email: null });
}

function toAppUser(row: {
  _id: string;
  clerkUserId: string;
  email: string | null;
  deletedAt?: number;
}) {
  if (row.deletedAt) return null;
  return {
    id: row._id,
    clerkUserId: row.clerkUserId,
    email: row.email,
  };
}
