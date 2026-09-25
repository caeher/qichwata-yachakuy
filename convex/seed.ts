import { v } from "convex/values";

import {
  INITIAL_COURSES,
  buildUnitContent,
} from "../lib/education/initial-catalog";

import { internalMutation } from "./_generated/server";

export const seedDraftCatalog = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const seed of INITIAL_COURSES) {
      const existing = await ctx.db
        .query("courses")
        .withIndex("by_slug_version", (q) =>
          q.eq("slug", seed.slug).eq("version", seed.version),
        )
        .unique();

      let courseId = existing?._id;
      if (!existing) {
        courseId = await ctx.db.insert("courses", {
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
          createdAt: Date.now(),
        });
      }

      const course = courseId ? await ctx.db.get(courseId) : null;
      if (!course || course.status !== "draft") continue;

      const existingUnits = await ctx.db
        .query("courseUnits")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();

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
        await ctx.db.insert("courseUnits", {
          courseId: course._id,
          position,
          title: unit.title,
          content: buildUnitContent(seed, unit),
        });
        seenSources.add(sourceKey);
      }
    }
    return null;
  },
});
