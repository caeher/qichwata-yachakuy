import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import schema from "@/convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const OWNER_ID = "convex-test-owner";
const OTHER_ID = "convex-test-other";

const failures = vi.hoisted(() => ({ provision: false, deletion: false }));

vi.mock("../../convex/lib/auth", async (importOriginal) => {
  const auth = await importOriginal<typeof import("../../convex/lib/auth")>();
  return {
    ...auth,
    provisionUserRecord: async (
      ...args: Parameters<typeof auth.provisionUserRecord>
    ) => {
      const shouldFail = failures.provision;
      failures.provision = false;
      const result = await auth.provisionUserRecord(...args);
      if (shouldFail) throw new Error("injected provisioning failure");
      return result;
    },
    markUserDeletedRecord: async (
      ...args: Parameters<typeof auth.markUserDeletedRecord>
    ) => {
      const shouldFail = failures.deletion;
      failures.deletion = false;
      const result = await auth.markUserDeletedRecord(...args);
      if (shouldFail) throw new Error("injected deletion failure");
      return result;
    },
  };
});

describe("Convex user access", () => {
  beforeEach(() => {
    failures.provision = false;
    failures.deletion = false;
  });
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

  it("retries user.created after failed provisioning without recording success", async () => {
    const t = convexTest(schema, modules);
    const event = {
      svixId: "evt_provision_retry",
      eventType: "user.created",
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    };

    failures.provision = true;
    await expect(
      t.mutation(internal.users.processWebhookEvent, event),
    ).rejects.toThrow("injected provisioning failure");

    const eventsAfterFailure = await t.run((ctx) =>
      ctx.db.query("webhookEvents").collect(),
    );
    const usersAfterFailure = await t.run((ctx) =>
      ctx.db.query("users").collect(),
    );
    expect(eventsAfterFailure).toHaveLength(0);
    expect(usersAfterFailure).toHaveLength(0);

    const retried = await t.mutation(internal.users.processWebhookEvent, event);
    const duplicate = await t.mutation(
      internal.users.processWebhookEvent,
      event,
    );
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    const events = await t.run((ctx) =>
      ctx.db.query("webhookEvents").collect(),
    );

    expect(users).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(retried).toBe(true);
    expect(duplicate).toBe(false);
  });

  it("recovers a legacy event row that was recorded before its effect", async () => {
    const t = convexTest(schema, modules);
    const event = {
      svixId: "evt_legacy_pending",
      eventType: "user.created",
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    };
    await t.run((ctx) =>
      ctx.db.insert("webhookEvents", {
        externalId: event.svixId,
        eventType: event.eventType,
        receivedAt: Date.now(),
      }),
    );

    await expect(
      t.mutation(internal.users.processWebhookEvent, event),
    ).resolves.toBe(true);
    await expect(
      t.mutation(internal.users.processWebhookEvent, event),
    ).resolves.toBe(false);

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", OWNER_ID))
        .unique(),
    );
    const webhookEvent = await t.run((ctx) =>
      ctx.db
        .query("webhookEvents")
        .withIndex("by_external_id", (q) => q.eq("externalId", event.svixId))
        .unique(),
    );
    expect(user?.email).toBe("owner@convex.test");
    expect(webhookEvent?.processedAt).toEqual(expect.any(Number));
  });

  it("retries user.deleted after failed deletion without recording success", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.users.processWebhookEvent, {
      svixId: "evt_delete_setup",
      eventType: "user.created",
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    });
    const deletion = {
      svixId: "evt_delete_retry",
      eventType: "user.deleted",
      clerkUserId: OWNER_ID,
    };

    failures.deletion = true;
    await expect(
      t.mutation(internal.users.processWebhookEvent, deletion),
    ).rejects.toThrow("injected deletion failure");

    const eventsAfterFailure = await t.run((ctx) =>
      ctx.db.query("webhookEvents").collect(),
    );
    const userAfterFailure = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", OWNER_ID))
        .unique(),
    );
    expect(eventsAfterFailure.map((event) => event.externalId)).toEqual([
      "evt_delete_setup",
    ]);
    expect(userAfterFailure?.deletedAt).toBeUndefined();

    await expect(
      t.mutation(internal.users.processWebhookEvent, deletion),
    ).resolves.toBe(true);
    await expect(
      t.mutation(internal.users.processWebhookEvent, deletion),
    ).resolves.toBe(false);

    const userAfterRetry = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", OWNER_ID))
        .unique(),
    );
    expect(userAfterRetry?.deletedAt).toEqual(expect.any(Number));
    expect(userAfterRetry?.email).toBeNull();
  });

  it("applies one effect for concurrent deliveries with the same svix-id", async () => {
    const t = convexTest(schema, modules);
    const event = {
      svixId: "evt_concurrent_duplicate",
      eventType: "user.created",
      clerkUserId: OWNER_ID,
      email: "owner@convex.test",
    };

    const results = await Promise.all([
      t.mutation(internal.users.processWebhookEvent, event),
      t.mutation(internal.users.processWebhookEvent, event),
    ]);
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    const events = await t.run((ctx) =>
      ctx.db.query("webhookEvents").collect(),
    );

    expect(results.sort()).toEqual([false, true]);
    expect(users).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});
