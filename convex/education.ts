import { ConvexError, v } from "convex/values";
import {
  canonicalCertificateJson,
  hashCertificatePayload,
} from "./lib/certificateCanonical";

import {
  isCourseEligibleForEnrollment,
  isUnitReadyForPublication,
  toLearnerCourseUnitContent,
} from "../lib/education/content";

import { internalQuery, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getUserByClerkId, requireIdentity } from "./lib/auth";

function toLearnerCourse(course: Doc<"courses">, contents: unknown[]) {
  return {
    _id: course._id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    version: course.version,
    status: course.status,
    demo: course.demo,
    level: course.level,
    accent: course.accent,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    enrollmentEnabled: course.enrollmentEnabled,
    completionPolicyVersion: course.completionPolicyVersion,
    completionPolicyStatus: course.completionPolicyStatus,
    enrollmentAvailable: isCourseEligibleForEnrollment({ course, contents }),
  };
}

const normalizeAnswer = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");

/** Full editorial catalog. Internal functions only; never expose this to learners. */
export const listCatalog = internalQuery({
  args: {},
  returns: v.object({
    courses: v.array(v.any()),
    units: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const courses = (await ctx.db.query("courses").collect()).filter(
      (course) => course.status !== "archived",
    );
    const units = (
      await Promise.all(
        courses.map((course) =>
          ctx.db
            .query("courseUnits")
            .withIndex("by_course", (q) => q.eq("courseId", course._id))
            .collect(),
        ),
      )
    ).flat();
    return { courses, units };
  },
});

export const listPublishedCatalog = query({
  args: {},
  returns: v.object({
    courses: v.array(v.any()),
    units: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const groups = await Promise.all(
      courses.map(async (course) => ({
        course,
        units: await ctx.db
          .query("courseUnits")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect(),
      })),
    );
    const visibleGroups = groups.flatMap(({ course, units }) => {
      const projectedUnits = units.map((unit) => ({
        unit,
        content: toLearnerCourseUnitContent(unit.content),
      }));
      if (
        units.length === 0 ||
        projectedUnits.some(({ content }) => content === null)
      ) {
        return [];
      }
      const learnerUnits = projectedUnits.flatMap(({ unit, content }) =>
        content
          ? [
              {
                _id: unit._id,
                courseId: unit.courseId,
                position: unit.position,
                title: unit.title,
                content,
              },
            ]
          : [],
      );
      return [
        {
          course: toLearnerCourse(
            course,
            units.map((unit) => unit.content),
          ),
          units: learnerUnits.sort((a, b) => a.position - b.position),
        },
      ];
    });
    return {
      courses: visibleGroups.map(({ course }) => course),
      units: visibleGroups.flatMap(({ units }) => units),
    };
  },
});

export const getCourseDetail = query({
  args: { courseId: v.id("courses") },
  returns: v.union(
    v.object({
      course: v.any(),
      units: v.array(v.any()),
      enrollment: v.union(v.any(), v.null()),
      progressUnitIds: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user.deletedAt) return null;

    const course = await ctx.db.get(args.courseId);
    if (!course || course.status !== "published") return null;
    const storedUnits = await ctx.db
      .query("courseUnits")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    storedUnits.sort((a, b) => a.position - b.position);
    const units = storedUnits.map((unit) => {
      const content = toLearnerCourseUnitContent(unit.content);
      if (!content) return null;
      return {
        _id: unit._id,
        courseId: unit.courseId,
        position: unit.position,
        title: unit.title,
        content,
      };
    });
    if (units.length === 0 || units.some((unit) => unit === null)) return null;
    const learnerUnits = units.filter(
      (unit): unit is NonNullable<typeof unit> => unit !== null,
    );

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_user_course_version", (q) =>
        q
          .eq("userId", user._id)
          .eq("courseId", course._id)
          .eq("courseVersion", course.version),
      )
      .unique();

    let progressUnitIds: string[] = [];
    if (enrollment) {
      const progress = await ctx.db
        .query("unitProgress")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      progressUnitIds = progress.map((row) => row.unitId);
    }

    return {
      course: toLearnerCourse(
        course,
        storedUnits.map((unit) => unit.content),
      ),
      units: learnerUnits,
      enrollment: enrollment ?? null,
      progressUnitIds,
    };
  },
});

export const enroll = mutation({
  args: { courseId: v.id("courses") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user.deletedAt) throw new ConvexError("not_authenticated");

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new ConvexError("course_unavailable");
    const content = await ctx.db
      .query("courseUnits")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    if (
      !isCourseEligibleForEnrollment({
        course: {
          ...course,
          enrollmentEnabled: course.enrollmentEnabled,
          status: course.status,
        },
        contents: content.map((unit) => unit.content),
      })
    ) {
      throw new ConvexError("course_unavailable");
    }

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_user_course_version", (q) =>
        q
          .eq("userId", user._id)
          .eq("courseId", course._id)
          .eq("courseVersion", course.version),
      )
      .unique();
    if (existing) return existing;

    const enrollmentId = await ctx.db.insert("enrollments", {
      userId: user._id,
      courseId: course._id,
      courseVersion: course.version,
      status: "active",
      enrolledAt: Date.now(),
    });
    return await ctx.db.get(enrollmentId);
  },
});

export const completeUnit = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    unitId: v.id("courseUnits"),
    answers: v.array(v.string()),
  },
  returns: v.object({
    progress: v.any(),
    feedback: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user.deletedAt) throw new ConvexError("not_authenticated");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (
      !enrollment ||
      enrollment.userId !== user._id ||
      enrollment.status !== "active"
    ) {
      throw new ConvexError("not_found");
    }
    const unit = await ctx.db.get(args.unitId);
    if (!unit || unit.courseId !== enrollment.courseId) {
      throw new ConvexError("not_found");
    }
    const course = await ctx.db.get(enrollment.courseId);
    if (!course || course.status !== "published") {
      throw new ConvexError("course_unavailable");
    }
    const content = isUnitReadyForPublication(unit.content)
      ? unit.content
      : null;
    const items = content?.activity.items;
    if (!items?.length || args.answers.length !== items.length) {
      throw new ConvexError("evidence_required");
    }
    const answersAreCorrect = items.every((item, index) => {
      const provided = normalizeAnswer(args.answers[index] ?? "");
      const accepted = [item.answer, ...(item.acceptedAnswers ?? [])].map(
        normalizeAnswer,
      );
      return provided.length > 0 && accepted.includes(provided);
    });
    if (!answersAreCorrect) throw new ConvexError("evidence_incorrect");

    // Feedback is withheld from learner reads until every answer is correct.

    const existing = await ctx.db
      .query("unitProgress")
      .withIndex("by_enrollment_unit", (q) =>
        q.eq("enrollmentId", enrollment._id).eq("unitId", unit._id),
      )
      .unique();
    if (existing) {
      return {
        progress: existing,
        feedback: items.map((item) => item.feedback),
      };
    }

    const progressId = await ctx.db.insert("unitProgress", {
      enrollmentId: enrollment._id,
      unitId: unit._id,
      completedAt: Date.now(),
    });
    const progress = await ctx.db.get(progressId);
    return { progress, feedback: items.map((item) => item.feedback) };
  },
});

export const finalizeEnrollment = mutation({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.object({
    completion: v.any(),
    certificate: v.union(v.any(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user.deletedAt) throw new ConvexError("not_authenticated");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.userId !== user._id) {
      throw new ConvexError("not_found");
    }
    const course = await ctx.db.get(enrollment.courseId);
    if (!course || course.version !== enrollment.courseVersion) {
      throw new ConvexError("course_unavailable");
    }
    const units = await ctx.db
      .query("courseUnits")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    if (
      !isCourseEligibleForEnrollment({
        course,
        contents: units.map((unit) => unit.content),
      })
    ) {
      throw new ConvexError("course_unavailable");
    }
    const progress = await ctx.db
      .query("unitProgress")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    if (units.length === 0 || progress.length !== units.length) {
      throw new ConvexError("criteria_pending");
    }
    if (course.completionPolicyStatus !== "approved") {
      throw new ConvexError("criteria_pending");
    }
    const prior = await ctx.db
      .query("courseCompletions")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .unique();
    if (prior) {
      const priorCertificate = await ctx.db
        .query("certificates")
        .withIndex("by_completion", (q) => q.eq("completionId", prior._id))
        .unique();
      return { completion: prior, certificate: priorCertificate ?? null };
    }
    const issuer = process.env.CERTIFICATE_ISSUER?.normalize("NFC").trim();
    if (!issuer) {
      throw new ConvexError("issuer_unconfigured");
    }

    const now = Date.now();
    const policyVersion = course.completionPolicyVersion;
    const completionId = await ctx.db.insert("courseCompletions", {
      enrollmentId: enrollment._id,
      courseVersion: course.version,
      policyVersion,
      validatedAt: now,
      eligible: true,
    });
    const completion = await ctx.db.get(completionId);
    if (!completion) throw new ConvexError("not_found");

    const publicId = crypto.randomUUID();
    const issuedAt = now;
    const snapshot = {
      schemaVersion: 1,
      certificateId: publicId,
      beneficiaryRef: publicId,
      issuer,
      course: {
        slug: course.slug,
        version: course.version,
        title: course.title.normalize("NFC").trim(),
      },
      completion: {
        policyVersion,
        completedAt: new Date(now).toISOString(),
      },
      issuedAt: new Date(issuedAt).toISOString(),
    };
    const canonical = canonicalCertificateJson({
      certificateId: publicId,
      beneficiaryRef: publicId,
      issuer: snapshot.issuer,
      course: snapshot.course,
      policyVersion,
      completedAt: new Date(now),
      issuedAt: new Date(issuedAt),
    });
    const sha256 = await hashCertificatePayload(canonical);
    const certificateRowId = await ctx.db.insert("certificates", {
      publicId,
      userId: user._id,
      completionId: completion._id,
      snapshot,
      schemaVersion: 1,
      sha256,
      status: "pending",
      createdAt: now,
    });
    await ctx.db.insert("auditEvents", {
      userId: user._id,
      action: "certificate_issue",
      certificateId: certificateRowId,
      meta: { sha256 },
      createdAt: now,
    });
    await ctx.db.patch(enrollment._id, { status: "completed" });
    const certificate = await ctx.db.get(certificateRowId);
    return { completion, certificate: certificate ?? null };
  },
});

export const getCoachContext = internalQuery({
  args: {
    clerkUserId: v.string(),
    enrollmentId: v.id("enrollments"),
    unitId: v.id("courseUnits"),
  },
  returns: v.union(
    v.object({
      courseTitle: v.string(),
      unitTitle: v.string(),
      unitContent: v.any(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkUserId);
    if (!user || user.deletedAt) return null;

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (
      !enrollment ||
      enrollment.userId !== user._id ||
      enrollment.status !== "active"
    ) {
      return null;
    }
    const course = await ctx.db.get(enrollment.courseId);
    const unit = await ctx.db.get(args.unitId);
    if (!course || !unit || unit.courseId !== course._id) return null;
    if (course.status !== "published" || !course.enrollmentEnabled) return null;
    return {
      courseTitle: course.title,
      unitTitle: unit.title,
      unitContent: unit.content,
    };
  },
});
