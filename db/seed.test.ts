import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { seedApplicationData } from "@/db/seed";
import {
  courseUnits,
  courses,
  enrollments,
  unitProgress,
  users,
} from "@/db/schema";
import { INITIAL_COURSES } from "@/lib/education/initial-catalog";
import { EducationError, enrollInCourse } from "@/lib/education/service";
import {
  isCourseEligibleForEnrollment,
  isCourseUnitContent,
} from "@/lib/education/content";

describe("initial learning catalog seed", () => {
  it("seeds the nine source keys as ordered drafts and is repeatable", async () => {
    const { db } = await createTestDb();
    const seed = seedApplicationData as unknown as (
      database: typeof db,
    ) => Promise<void>;

    await seed(db);
    const firstCourseRows = await db.query.courses.findMany();
    const firstUnits = await db.query.courseUnits.findMany();
    const firstCourse = firstCourseRows.find(
      (course) => course.slug === INITIAL_COURSES[0]!.slug,
    )!;
    const firstUnit = firstUnits.find(
      (unit) => unit.courseId === firstCourse.id,
    )!;
    const [user] = await db
      .insert(users)
      .values({ clerkUserId: "catalog-seed-progress-user" })
      .returning();
    await expect(
      enrollInCourse(db, { userId: user!.id, courseId: firstCourse.id }),
    ).rejects.toBeInstanceOf(EducationError);
    const [enrollment] = await db
      .insert(enrollments)
      .values({
        userId: user!.id,
        courseId: firstCourse.id,
        courseVersion: firstCourse.version,
      })
      .returning();
    await db
      .insert(unitProgress)
      .values({ enrollmentId: enrollment!.id, unitId: firstUnit.id });
    const priorProgress = await db.query.unitProgress.findMany();
    await seed(db);
    const secondCourseRows = await db.query.courses.findMany();
    const secondUnits = await db.query.courseUnits.findMany();

    expect(firstCourseRows).toHaveLength(3);
    expect(secondCourseRows).toHaveLength(3);
    expect(firstUnits).toHaveLength(9);
    expect(secondUnits).toHaveLength(9);
    expect(firstCourseRows.map((course) => course.slug).sort()).toEqual(
      INITIAL_COURSES.map((course) => course.slug).sort(),
    );
    expect(
      firstCourseRows.every(
        (course) => course.status === "draft" && !course.enrollmentEnabled,
      ),
    ).toBe(true);
    expect(
      firstCourseRows.every(
        (course) =>
          course.completionPolicyVersion === "pending-v1" &&
          course.completionPolicyStatus === "pending",
      ),
    ).toBe(true);

    for (const course of firstCourseRows) {
      const courseSeed = INITIAL_COURSES.find(
        (item) => item.slug === course.slug,
      )!;
      const units = firstUnits
        .filter((unit) => unit.courseId === course.id)
        .sort((a, b) => a.position - b.position);
      expect(units.map((unit) => unit.position)).toEqual([1, 2, 3]);
      expect(
        units.map(
          (unit) =>
            (unit.content as { source: { lessonId: string } }).source.lessonId,
        ),
      ).toEqual(courseSeed.units.map((unit) => unit.lessonId));
      for (const unit of units) {
        expect(isCourseUnitContent(unit.content)).toBe(true);
        const content = unit.content as {
          status: string;
          review: { status: string };
          sources: { status: string; items: unknown[] };
          regionalVariant: { status: string };
          authorship: { status: string };
          activity: { modality: string; audioStatus: string };
        };
        expect(content.status).toBe("draft");
        expect(content.review.status).toBe("draft");
        expect(content.sources).toMatchObject({ status: "pending", items: [] });
        expect(content.regionalVariant.status).toBe("undetermined");
        expect(content.authorship.status).toBe("pending");
        expect(
          isCourseEligibleForEnrollment({
            course: { ...course, status: "published", enrollmentEnabled: true },
            contents: [unit.content],
          }),
        ).toBe(false);
        if (
          (unit.content as { source: { lessonId: string } }).source.lessonId ===
          "practica-02"
        ) {
          expect(content.activity).toMatchObject({
            modality: "text",
            audioStatus: "planned",
          });
        }
      }
    }

    expect(secondUnits.map(({ id, content }) => ({ id, content }))).toEqual(
      firstUnits.map(({ id, content }) => ({ id, content })),
    );
    expect(await db.query.unitProgress.findMany()).toEqual(priorProgress);
  });

  it("preserves a published course version when rerun", async () => {
    const { db } = await createTestDb();
    const seed = seedApplicationData as unknown as (
      database: typeof db,
    ) => Promise<void>;
    await seed(db);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, INITIAL_COURSES[0]!.slug),
    });
    if (!course) throw new Error("seeded course missing");
    await db
      .update(courses)
      .set({ status: "published", title: "Título revisado" })
      .where(eq(courses.id, course.id));
    await db
      .update(courseUnits)
      .set({ title: "Unidad protegida" })
      .where(eq(courseUnits.courseId, course.id));

    await seed(db);

    expect(
      (await db.query.courses.findFirst({ where: eq(courses.id, course.id) }))
        ?.title,
    ).toBe("Título revisado");
    expect(
      (
        await db.query.courseUnits.findMany({
          where: eq(courseUnits.courseId, course.id),
        })
      ).map((unit) => unit.title),
    ).toEqual(["Unidad protegida", "Unidad protegida", "Unidad protegida"]);
  });
});
