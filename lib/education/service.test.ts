import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { publishedUnitContent } from "@/db/test-fixtures";
import {
  certificates,
  courseCompletions,
  courses,
  courseUnits,
  enrollments,
  unitProgress,
} from "@/db/schema";
import { provisionUser } from "@/lib/auth/provision-user";
import {
  completeUnit,
  EducationError,
  enrollInCourse,
  finalizeEnrollment,
} from "@/lib/education/service";

async function educationFixture() {
  const { db } = await createTestDb();
  const { userId } = await provisionUser(db, {
    clerkUserId: "education-user",
    email: "learner@example.test",
  });
  const [course] = await db
    .insert(courses)
    .values({
      slug: "quechua-intro",
      title: "Introducción al Quechua",
      version: "1.0",
      status: "published",
      enrollmentEnabled: true,
    })
    .returning();
  const [unit1, unit2] = await db
    .insert(courseUnits)
    .values([
      {
        courseId: course.id,
        position: 1,
        title: "Saludos",
        content: publishedUnitContent(),
      },
      {
        courseId: course.id,
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
      },
    ])
    .returning();
  return { db, userId, course, units: [unit1, unit2] };
}

describe("education completion and certificate intent", () => {
  it("persists progress idempotently and keeps the production policy closed", async () => {
    const { db, userId, course, units } = await educationFixture();
    const enrollment = await enrollInCourse(db, {
      userId,
      courseId: course.id,
    });
    expect((await enrollInCourse(db, { userId, courseId: course.id })).id).toBe(
      enrollment.id,
    );
    await Promise.all([
      completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: ["fixture response"],
      }),
      completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: ["FIXTURE   RESPONSE"],
      }),
    ]);
    await completeUnit(db, {
      userId,
      enrollmentId: enrollment.id,
      unitId: units[1]!.id,
      answers: ["another accepted response"],
    });
    expect(await db.select().from(unitProgress)).toHaveLength(2);
    await expect(
      finalizeEnrollment(db, {
        userId,
        enrollmentId: enrollment.id,
        issuer: "Issuer",
      }),
    ).rejects.toMatchObject({ code: "criteria_pending" });
    expect(await db.select().from(courseCompletions)).toHaveLength(0);
    expect(await db.select().from(certificates)).toHaveLength(0);
  });

  it("creates one immutable certificate snapshot only after an eligible server policy", async () => {
    const { db, userId, course, units } = await educationFixture();
    const enrollment = await enrollInCourse(db, {
      userId,
      courseId: course.id,
    });
    for (const unit of units)
      await completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: unit.id,
        answers: ["fixture response"],
      });
    const policy = ({
      progressCount,
      unitCount,
    }: {
      progressCount: number;
      unitCount: number;
    }) =>
      progressCount === unitCount
        ? { eligible: true as const, policyVersion: "test-policy-v1" }
        : { eligible: false as const, reason: "criteria_pending" as const };
    const issuedAt = new Date("2026-04-05T06:07:08.000Z");
    const [first, second] = await Promise.all([
      finalizeEnrollment(db, {
        userId,
        enrollmentId: enrollment.id,
        issuer: "Issuer validado",
        policy,
        now: issuedAt,
      }),
      finalizeEnrollment(db, {
        userId,
        enrollmentId: enrollment.id,
        issuer: "Issuer actualizado",
        policy,
        now: new Date(),
      }),
    ]);
    expect(first.completion.id).toBe(second.completion.id);
    expect(first.certificate?.id).toBe(second.certificate?.id);
    expect(first.certificate?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.certificate?.snapshot).toMatchObject({
      issuer: "Issuer validado",
      course: { title: "Introducción al Quechua" },
    });
    expect(await db.select().from(courseCompletions)).toHaveLength(1);
    expect(await db.select().from(certificates)).toHaveLength(1);
    const otherUser = await provisionUser(db, {
      clerkUserId: "other-education-user",
      email: null,
    });
    await expect(
      completeUnit(db, {
        userId: otherUser.userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: ["fixture response"],
      }),
    ).rejects.toBeInstanceOf(EducationError);
  });

  it("does not let a learner complete a unit from a different course", async () => {
    const { db, userId, units } = await educationFixture();
    const [other] = await db
      .insert(courses)
      .values({
        slug: "other",
        title: "Otro",
        version: "1",
        status: "published",
        enrollmentEnabled: true,
      })
      .returning();
    await db.insert(courseUnits).values({
      courseId: other.id,
      position: 1,
      title: "Otra unidad",
      content: publishedUnitContent(),
    });
    const enrollment = await enrollInCourse(db, { userId, courseId: other.id });
    await expect(
      completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: ["fixture response"],
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(
      await db.query.enrollments.findFirst({
        where: eq(enrollments.id, enrollment.id),
      }),
    ).toBeTruthy();
  });

  it("requires correct activity evidence before writing completion", async () => {
    const { db, userId, course, units } = await educationFixture();
    const enrollment = await enrollInCourse(db, {
      userId,
      courseId: course.id,
    });
    await expect(
      completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: [""],
      }),
    ).rejects.toMatchObject({ code: "evidence_incorrect" });
    await expect(
      completeUnit(db, {
        userId,
        enrollmentId: enrollment.id,
        unitId: units[0]!.id,
        answers: [],
      }),
    ).rejects.toMatchObject({ code: "evidence_required" });
    expect(await db.select().from(unitProgress)).toHaveLength(0);
  });
});
