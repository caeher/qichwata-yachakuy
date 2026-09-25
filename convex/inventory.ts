import { v } from "convex/values";

import { internalQuery } from "./_generated/server";

const TABLE_NAMES = [
  "plans",
  "users",
  "courses",
  "courseUnits",
  "enrollments",
  "unitProgress",
  "courseCompletions",
  "certificates",
  "documents",
  "anchors",
  "auditEvents",
  "usageEvents",
  "webhookEvents",
  "legacyObjectInventory",
] as const;

/** Non-PII counts for migration verification (operator runs via deploy key). */
export const deploymentInventory = internalQuery({
  args: {},
  returns: v.object({
    tableCounts: v.record(v.string(), v.number()),
    courseSlugs: v.array(v.string()),
    draftEnrollmentDisabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const tableCounts: Record<string, number> = {};
    for (const name of TABLE_NAMES) {
      const rows = await ctx.db.query(name).collect();
      tableCounts[name] = rows.length;
    }
    const courses = await ctx.db.query("courses").collect();
    const courseSlugs = courses.map((c) => c.slug).sort();
    const draftEnrollmentDisabled = courses.every(
      (c) => c.status === "draft" && !c.enrollmentEnabled,
    );
    return { tableCounts, courseSlugs, draftEnrollmentDisabled };
  },
});
