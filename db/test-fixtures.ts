import { eq } from "drizzle-orm";

import { LEGACY_MONTHLY_ANCHOR_LIMIT } from "@/db/constants";
import type { TestDatabase } from "@/db/pglite";
import { plans, users } from "@/db/schema";
import { provisionUser } from "@/lib/auth/provision-user";

/** Minimal ready content used only to exercise enrollment in isolated tests. */
export function publishedUnitContent() {
  return {
    schemaVersion: 1,
    status: "published",
    kind: "practice",
    durationMinutes: 5,
    objectives: ["Test fixture objective"],
    reading: { title: "Fixture", paragraphs: ["Test fixture content."] },
    vocabulary: [],
    phrases: [],
    examples: [],
    activity: {
      title: "Fixture",
      instructions: ["Complete the fixture."],
      items: [],
      modality: "text",
      audioStatus: "not_required",
    },
    review: {
      status: "reviewed",
      reviewedBy: "test reviewer",
      reviewedAt: "2026-01-01",
      notes: [],
    },
    sources: {
      status: "documented",
      items: [
        {
          citation: "Fixture source",
          license: "Fixture license",
          usedFor: "Test",
        },
      ],
      requirements: [],
    },
    regionalVariant: {
      status: "specified",
      name: "Fixture variety",
      notes: "Test only",
    },
    authorship: {
      status: "attributed",
      author: "Test fixture",
      license: "Fixture license",
    },
    source: { system: "test-fixture", moduleSlug: "test", lessonId: "fixture" },
  };
}

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
