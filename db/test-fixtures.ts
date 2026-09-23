import { eq } from "drizzle-orm";

import { LEGACY_MONTHLY_ANCHOR_LIMIT } from "@/db/constants";
import type { TestDatabase } from "@/db/pglite";
import { plans, users } from "@/db/schema";
import { provisionUser } from "@/lib/auth/provision-user";

export async function provisionLegacyFreeUser(
  db: TestDatabase,
  input: { clerkUserId: string; email: string | null },
) {
  const existingPlan = await db.query.plans.findFirst();
  const plan =
    existingPlan ??
    (
      await db
        .insert(plans)
        .values({
          monthlyAnchorsIncluded: LEGACY_MONTHLY_ANCHOR_LIMIT,
        })
        .returning()
    )[0];

  const account = await provisionUser(db, input);
  await db
    .update(users)
    .set({ planId: plan!.id })
    .where(eq(users.id, account.userId));
  return account;
}
