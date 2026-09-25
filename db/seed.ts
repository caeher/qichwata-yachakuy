import { fileURLToPath } from "node:url";

import { getDb } from "@/db/client";
import { courseUnits, courses } from "@/db/schema";
import {
  INITIAL_COURSES,
  buildUnitContent,
} from "@/lib/education/initial-catalog";

/**
 * Insert the initial educational catalog as drafts. Existing course versions,
 * published content and progress are left untouched.
 */
export async function seedApplicationData(db = getDb()): Promise<void> {
  for (const seed of INITIAL_COURSES) {
    await db
      .insert(courses)
      .values({
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        level: seed.level,
        accent: seed.accent,
        estimatedDurationMinutes: seed.estimatedDurationMinutes,
        version: seed.version,
        status: "draft",
        demo: false,
        enrollmentEnabled: false,
        completionPolicyVersion: seed.completionPolicyVersion,
        completionPolicyStatus: "pending",
      })
      .onConflictDoNothing({ target: [courses.slug, courses.version] });

    const course = await db.query.courses.findFirst({
      where: (row, { and, eq }) =>
        and(eq(row.slug, seed.slug), eq(row.version, seed.version)),
    });
    if (!course || course.status !== "draft") continue;

    const existingUnits = await db.query.courseUnits.findMany({
      where: (row, { eq }) => eq(row.courseId, course.id),
    });
    const seenSources = new Set(
      existingUnits.map((unit) => {
        const source = unit.content as {
          source?: { system?: string; moduleSlug?: string; lessonId?: string };
        };
        return source?.source?.system === "yachay-convex"
          ? `${source.source.moduleSlug}/${source.source.lessonId}`
          : "";
      }),
    );
    const positions = new Set(existingUnits.map((unit) => unit.position));
    let nextPosition =
      existingUnits.reduce(
        (maximum, unit) => Math.max(maximum, unit.position),
        0,
      ) + 1;

    for (const [index, unit] of seed.units.entries()) {
      const sourceKey = `${seed.slug}/${unit.lessonId}`;
      if (seenSources.has(sourceKey)) continue;
      const preferredPosition = index + 1;
      const position = positions.has(preferredPosition)
        ? nextPosition++
        : preferredPosition;
      positions.add(position);
      await db.insert(courseUnits).values({
        courseId: course.id,
        position,
        title: unit.title,
        content: buildUnitContent(seed, unit),
      });
      seenSources.add(sourceKey);
    }
  }
}

async function main() {
  await seedApplicationData();
  console.log("Initial learning catalog seeded as drafts.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
