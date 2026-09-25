import { v } from "convex/values";

import {
  isCourseEligibleForEnrollment,
  isUnitReadyForPublication,
} from "../lib/education/content";

import { query } from "./_generated/server";
import { getUserByClerkId, requireIdentity } from "./lib/auth";

export const loadLearningSummary = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user._id !== args.userId) {
      return emptySummary(0);
    }

    const userEnrollments = (
      await ctx.db
        .query("enrollments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()
    )
      .filter((row) => row.status === "active" || row.status === "completed")
      .sort((a, b) => a.enrolledAt - b.enrolledAt);

    const userCertificates = await ctx.db
      .query("certificates")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .collect();

    if (!userEnrollments.length) {
      return emptySummary(userCertificates.length);
    }

    const enrollmentIds = new Set(userEnrollments.map((row) => row._id));
    const courseIds = [...new Set(userEnrollments.map((row) => row.courseId))];

    const catalogCourses = (
      await Promise.all(courseIds.map((id) => ctx.db.get(id)))
    ).filter((row): row is NonNullable<typeof row> => row !== null);

    const catalogUnits = (
      await Promise.all(
        courseIds.map((courseId) =>
          ctx.db
            .query("courseUnits")
            .withIndex("by_course", (q) => q.eq("courseId", courseId))
            .collect(),
        ),
      )
    ).flat();

    const progressRows = (
      await Promise.all(
        [...enrollmentIds].map((enrollmentId) =>
          ctx.db
            .query("unitProgress")
            .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollmentId))
            .collect(),
        ),
      )
    ).flat();

    const completions = (
      await Promise.all(
        [...enrollmentIds].map((enrollmentId) =>
          ctx.db
            .query("courseCompletions")
            .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollmentId))
            .unique(),
        ),
      )
    ).filter(
      (row): row is NonNullable<typeof row> => row !== null && row.eligible,
    );

    const courseById = new Map(catalogCourses.map((course) => [course._id, course]));
    const unitsByCourse = new Map<string, typeof catalogUnits>();
    for (const unit of catalogUnits) {
      const units = unitsByCourse.get(unit.courseId) ?? [];
      units.push(unit);
      unitsByCourse.set(unit.courseId, units);
    }
    const progressByEnrollment = new Map<string, Set<string>>();
    for (const row of progressRows) {
      const completed =
        progressByEnrollment.get(row.enrollmentId) ?? new Set<string>();
      completed.add(row.unitId);
      progressByEnrollment.set(row.enrollmentId, completed);
    }
    const completionByEnrollment = new Map(
      completions.map((completion) => [completion.enrollmentId, completion]),
    );
    const certificateByCompletion = new Map(
      userCertificates.map((certificate) => [
        certificate.completionId,
        certificate,
      ]),
    );

    const accents = new Set(["leaf", "clay", "gold"]);
    const summaryCourses: Array<{
      enrollmentId: string;
      courseId: string;
      title: string;
      description: string;
      accent: string;
      version: string;
      unitCount: number;
      completedCount: number;
      progress: number;
      status: string;
      certificate: string;
      nextUnit: { id: string; title: string } | null;
    }> = [];

    for (const enrollment of userEnrollments) {
      const course = courseById.get(enrollment.courseId);
      const rawUnits = unitsByCourse.get(enrollment.courseId) ?? [];
      if (!course || course.version !== enrollment.courseVersion) continue;
      const validUnits = rawUnits.filter((unit) =>
        isUnitReadyForPublication(unit.content),
      );
      if (
        !isCourseEligibleForEnrollment({
          course,
          contents: rawUnits.map((unit) => unit.content),
        }) ||
        validUnits.length === 0
      ) {
        continue;
      }

      const completedIds =
        progressByEnrollment.get(enrollment._id) ?? new Set<string>();
      const validIds = new Set(validUnits.map((unit) => unit._id as string));
      const completedCount = [...completedIds].filter((id) =>
        validIds.has(id),
      ).length;
      const nextUnit = validUnits.find(
        (unit) => !completedIds.has(unit._id as string),
      );
      const done = completedCount === validUnits.length;
      const completion = completionByEnrollment.get(enrollment._id);
      const certificate = completion
        ? certificateByCompletion.get(completion._id)
        : undefined;
      const certificateLabel = certificate
        ? certificate.status === "anchored"
          ? "Certificado verificado"
          : certificate.status === "failed"
            ? "Certificado disponible · anclaje fallido"
            : "Certificado disponible · anclaje pendiente"
        : done
          ? course.completionPolicyStatus === "approved"
            ? "Evaluación de certificado pendiente"
            : "Política de certificado pendiente"
          : "Disponible al completar el curso";

      summaryCourses.push({
        enrollmentId: enrollment._id,
        courseId: course._id,
        title: course.title,
        description: course.description,
        accent: accents.has(course.accent)
          ? course.accent
          : "leaf",
        version: course.version,
        unitCount: validUnits.length,
        completedCount,
        progress: Math.round((completedCount / validUnits.length) * 100),
        status: done
          ? "completed"
          : completedCount > 0
            ? "in-progress"
            : "available",
        certificate: certificateLabel,
        nextUnit: nextUnit
          ? { id: nextUnit._id, title: nextUnit.title }
          : null,
      });
    }

    const totalUnits = summaryCourses.reduce(
      (count, course) => count + course.unitCount,
      0,
    );
    const completedUnits = summaryCourses.reduce(
      (count, course) => count + course.completedCount,
      0,
    );
    const completedCourses = summaryCourses.filter(
      (course) => course.status === "completed",
    ).length;
    const next = summaryCourses.find((course) => course.nextUnit);

    return {
      courses: summaryCourses,
      totalUnits,
      completedUnits,
      completedCourses,
      certificateCount: userCertificates.length,
      progress:
        totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100),
      next: next ?? null,
    };
  },
});

function emptySummary(certificateCount: number) {
  return {
    courses: [],
    totalUnits: 0,
    completedUnits: 0,
    completedCourses: 0,
    certificateCount,
    progress: 0,
    next: null,
  };
}
