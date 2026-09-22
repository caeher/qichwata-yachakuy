import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { plans, subscriptions, users } from "@/db/schema";
import { markUserDeleted, provisionFreePlan } from "@/lib/auth/provision-user";

describe("provisionFreePlan", () => {
  it("creates a free user and active subscription", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);

    const { userId } = await provisionFreePlan(db, {
      clerkUserId: "user_free_1",
      email: "free@example.com",
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const free = await db.query.plans.findFirst({
      where: eq(plans.slug, "free"),
    });
    expect(user?.planId).toBe(free?.id);

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    expect(subs).toHaveLength(1);
    expect(subs[0]?.status).toBe("active");
  });

  it("is idempotent for the same clerk user id", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);

    await provisionFreePlan(db, {
      clerkUserId: "user_dup",
      email: "a@example.com",
    });
    await provisionFreePlan(db, {
      clerkUserId: "user_dup",
      email: "b@example.com",
    });

    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "user_dup"));
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0]?.email).toBe("b@example.com");

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, allUsers[0]!.id));
    expect(subs).toHaveLength(1);
  });

  it("markUserDeleted sets deleted_at and tolerates repeat calls", async () => {
    const { db } = await createTestDb();
    await seedPlans(db);

    await provisionFreePlan(db, {
      clerkUserId: "user_del",
      email: null,
    });

    await markUserDeleted(db, "user_del");
    await markUserDeleted(db, "user_del");

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, "user_del"),
    });
    expect(user?.deletedAt).not.toBeNull();

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user!.id));
    expect(subs[0]?.status).toBe("canceled");
  });
});
