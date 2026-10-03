import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { publishedUnitContent } from "@/db/test-fixtures";
import { api, internal } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import schema from "@/convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const CLERK_ID = "convex-test-clerk-user";

async function asLearner(t: ReturnType<typeof convexTest>) {
  const authed = t.withIdentity({ subject: CLERK_ID });
  await authed.mutation(api.users.resolveAppUser, {
    clerkUserId: CLERK_ID,
    email: "learner@convex.test",
  });
  return authed;
}

async function publishedCourseFixture(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const courseId = await ctx.db.insert("courses", {
      slug: "quechua-intro",
      title: "Introducción al Quechua",
      description: "",
      version: "1.0",
      status: "published",
      demo: false,
      level: "beginner",
      accent: "leaf",
      estimatedDurationMinutes: 30,
      enrollmentEnabled: true,
      completionPolicyVersion: "pending-v1",
      completionPolicyStatus: "pending",
      createdAt: Date.now(),
    });
    const unit1 = await ctx.db.insert("courseUnits", {
      courseId,
      position: 1,
      title: "Saludos",
      content: publishedUnitContent(),
    });
    const unit2 = await ctx.db.insert("courseUnits", {
      courseId,
      position: 2,
      title: "Presentación",
      content: {
        ...publishedUnitContent(),
        source: {
          system: "test-fixture",
          moduleSlug: "test",
          lessonId: "fixture-2",
        },
      },
    });
    return { courseId, units: [unit1, unit2] as Id<"courseUnits">[] };
  });
}

describe("Convex education persistence", () => {
  it("seedDraftCatalog is idempotent and creates three draft modules", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.seedDraftCatalog, {});
    await t.mutation(internal.seed.seedDraftCatalog, {});
    const courses = await t.run(async (ctx) =>
      ctx.db.query("courses").collect(),
    );
    const slugs = courses.map((c) => c.slug).sort();
    expect(slugs).toEqual([
      "familia-y-comunidad",
      "saludos-y-presencia",
      "territorio-y-tiempo",
    ]);
    expect(
      courses.every((c) => c.status === "draft" && !c.enrollmentEnabled),
    ).toBe(true);
  });

  it("rejects enrollment when the course is not published", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.seedDraftCatalog, {});
    const authed = await asLearner(t);
    const draft = await t.run(async (ctx) => {
      return await ctx.db
        .query("courses")
        .withIndex("by_slug_version", (q) =>
          q.eq("slug", "saludos-y-presencia").eq("version", "1.0.0"),
        )
        .unique();
    });
    expect(draft).toBeTruthy();
    await expect(
      authed.mutation(api.education.enroll, { courseId: draft!._id }),
    ).rejects.toBeInstanceOf(ConvexError);
  });

  it("enrolls, completes units idempotently, and blocks finalize while policy pending", async () => {
    const t = convexTest(schema, modules);
    const authed = await asLearner(t);
    const { courseId, units } = await publishedCourseFixture(t);
    const enrollment = await authed.mutation(api.education.enroll, {
      courseId,
    });
    expect(enrollment).toBeTruthy();
    const again = await authed.mutation(api.education.enroll, { courseId });
    expect(again?._id).toBe(enrollment!._id);

    await authed.mutation(api.education.completeUnit, {
      enrollmentId: enrollment!._id,
      unitId: units[0],
      answers: ["fixture response"],
    });
    await authed.mutation(api.education.completeUnit, {
      enrollmentId: enrollment!._id,
      unitId: units[0],
      answers: ["FIXTURE   RESPONSE"],
    });
    await authed.mutation(api.education.completeUnit, {
      enrollmentId: enrollment!._id,
      unitId: units[1],
      answers: ["another accepted response"],
    });

    const progressCount = await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("unitProgress")
        .withIndex("by_enrollment", (q) =>
          q.eq("enrollmentId", enrollment!._id),
        )
        .collect();
      return rows.length;
    });
    expect(progressCount).toBe(2);

    await expect(
      authed.mutation(api.education.finalizeEnrollment, {
        enrollmentId: enrollment!._id,
        issuer: "Issuer",
      }),
    ).rejects.toBeInstanceOf(ConvexError);

    const certCount = await t.run(async (ctx) => {
      return (await ctx.db.query("certificates").collect()).length;
    });
    expect(certCount).toBe(0);
  });

  it("exposes certificate by publicId and sha256 after approved policy", async () => {
    const t = convexTest(schema, modules);
    const authed = await asLearner(t);
    const { courseId, units } = await t.run(async (ctx) => {
      const courseId = await ctx.db.insert("courses", {
        slug: "quechua-cert",
        title: "Cert test",
        description: "",
        version: "1.0",
        status: "published",
        demo: false,
        level: "beginner",
        accent: "leaf",
        estimatedDurationMinutes: 10,
        enrollmentEnabled: true,
        completionPolicyVersion: "approved-v1",
        completionPolicyStatus: "approved",
        createdAt: Date.now(),
      });
      const unitIds: Id<"courseUnits">[] = [];
      for (let i = 0; i < 2; i++) {
        unitIds.push(
          await ctx.db.insert("courseUnits", {
            courseId,
            position: i + 1,
            title: `U${i + 1}`,
            content: publishedUnitContent(),
          }),
        );
      }
      return { courseId, units: unitIds };
    });

    const enrollment = await authed.mutation(api.education.enroll, {
      courseId,
    });
    for (const unitId of units) {
      await authed.mutation(api.education.completeUnit, {
        enrollmentId: enrollment!._id,
        unitId,
        answers: ["fixture response"],
      });
    }
    const { certificate } = await authed.mutation(
      api.education.finalizeEnrollment,
      { enrollmentId: enrollment!._id, issuer: "Test Issuer" },
    );
    expect(certificate?.publicId).toBeTruthy();
    expect(certificate?.sha256).toMatch(/^[a-f0-9]{64}$/);

    const byPublic = await t.query(api.certificates.getByPublicId, {
      publicId: certificate!.publicId,
    });
    expect(byPublic?.publicId).toBe(certificate!.publicId);

    const byHash = await t.query(api.certificates.getBySha256, {
      sha256: certificate!.sha256,
    });
    expect(byHash?.publicId).toBe(certificate!.publicId);
  });
});
