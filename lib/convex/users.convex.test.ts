import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import schema from "@/convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const OWNER_ID = "convex-test-owner";
const OTHER_ID = "convex-test-other";

describe("Convex user access", () => {
  it("rejects anonymous provisioning and profile reads", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.users.resolveAppUser, {}),
    ).rejects.toBeInstanceOf(ConvexError);
    await t.mutation(internal.users.provisionFromWebhook, {
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    });
    await expect(
      t.query(api.users.getAppUserByClerkId, {}),
    ).rejects.toBeInstanceOf(ConvexError);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("owner@convex.test");
  });

  it("derives the user ID from identity and does not expose another user's email", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.users.provisionFromWebhook, {
      clerkUserId: OTHER_ID,
      email: "other@convex.test",
    });

    const owner = t.withIdentity({
      subject: OWNER_ID,
      email: "owner@convex.test",
      emailVerified: true,
    });
    const legacyArgs = {
      clerkUserId: OTHER_ID,
      email: "attacker@convex.test",
    };

    await owner
      .mutation(api.users.resolveAppUser, legacyArgs as never)
      .catch(() => null);
    const profile = await owner
      .query(api.users.getAppUserByClerkId, { clerkUserId: OTHER_ID } as never)
      .catch(() => null);

    const otherUser = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", OTHER_ID))
        .unique(),
    );
    expect(otherUser?.email).toBe("other@convex.test");
    expect(profile?.email).not.toBe("other@convex.test");
  });

  it("provisions and reads the authenticated user idempotently", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: OWNER_ID,
      email: "owner@convex.test",
      emailVerified: true,
    });

    const first = await owner.mutation(api.users.resolveAppUser, {});
    const second = await owner.mutation(api.users.resolveAppUser, {});
    const profile = await owner.query(api.users.getAppUserByClerkId, {});
    const users = await t.run((ctx) => ctx.db.query("users").collect());

    expect(first).toEqual({
      id: expect.any(String),
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    });
    expect(second).toEqual(first);
    expect(profile).toEqual(first);
    expect(users).toHaveLength(1);
  });

  it("does not replace a stored email with an unverified identity claim", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.users.provisionFromWebhook, {
      clerkUserId: OWNER_ID,
      email: "verified@convex.test",
    });
    const owner = t.withIdentity({
      subject: OWNER_ID,
      email: "unverified@convex.test",
      emailVerified: false,
    });

    await owner.mutation(api.users.resolveAppUser, {});
    const profile = await owner.query(api.users.getAppUserByClerkId, {});

    expect(profile?.email).toBe("verified@convex.test");
  });

  it("keeps internal webhook provisioning and event recording idempotent", async () => {
    const t = convexTest(schema, modules);
    const provisionInput = {
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    };

    await t.mutation(internal.users.provisionFromWebhook, provisionInput);
    await t.mutation(internal.users.provisionFromWebhook, provisionInput);
    const firstEvent = await t.mutation(internal.users.recordWebhookEvent, {
      svixId: "evt_convex_test",
      eventType: "user.created",
    });
    const duplicateEvent = await t.mutation(internal.users.recordWebhookEvent, {
      svixId: "evt_convex_test",
      eventType: "user.created",
    });
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    const events = await t.run((ctx) =>
      ctx.db.query("webhookEvents").collect(),
    );

    expect(users).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(firstEvent).toBe(true);
    expect(duplicateEvent).toBe(false);
  });
});
