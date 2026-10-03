import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { users } from "@/db/schema";
import { markUserDeleted, provisionUser } from "@/lib/auth/provision-user";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";

describe("provisionUser", () => {
  it("creates an account without plans or subscriptions", async () => {
    const { db } = await createTestDb();

    const { userId } = await provisionUser(db, {
      clerkUserId: "clerk_individual_1",
      email: "learner@example.com",
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.planId).toBeNull();
    expect(user?.clerkUserId).toBe("clerk_individual_1");
    expect(user?.email).toBe("learner@example.com");
    const subscriptionTable = await db.execute(
      sql`select to_regclass('public.subscriptions') as table_name`,
    );
    expect(subscriptionTable.rows[0]?.table_name).toBeNull();
  });

  it("is idempotent, preserves the internal ID, and synchronizes email", async () => {
    const { db } = await createTestDb();

    const first = await provisionUser(db, {
      clerkUserId: "clerk_repeat",
      email: "old@example.com",
    });
    const second = await provisionUser(db, {
      clerkUserId: "clerk_repeat",
      email: "new@example.com",
    });

    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "clerk_repeat"));
    expect(second.userId).toBe(first.userId);
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0]?.email).toBe("new@example.com");
  });

  it("resolves an account concurrently without duplicating it", async () => {
    const { db } = await createTestDb();
    const resolved = await Promise.all(
      Array.from({ length: 2 }, () =>
        resolveAppUser(db, "clerk_concurrent", "c@example.com"),
      ),
    );
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "clerk_concurrent"));

    expect(allUsers).toHaveLength(1);
    expect(resolved.map((user) => user?.id)).toEqual([
      allUsers[0]?.id,
      allUsers[0]?.id,
    ]);
  });

  it("does not restore a deleted identity and tolerates repeat deletion", async () => {
    const { db } = await createTestDb();
    const account = await provisionUser(db, {
      clerkUserId: "clerk_deleted",
      email: "d@example.com",
    });

    await markUserDeleted(db, "clerk_deleted");
    await markUserDeleted(db, "clerk_deleted");

    expect(await resolveAppUser(db, "clerk_deleted", "again@example.com")).toBe(
      null,
    );
    const user = await db.query.users.findFirst({
      where: eq(users.id, account.userId),
    });
    expect(user?.deletedAt).not.toBeNull();
    expect(user?.email).toBeNull();
  });
});
