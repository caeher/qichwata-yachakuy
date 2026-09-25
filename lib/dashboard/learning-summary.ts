import { api, convexConfigured, convexQuery } from "@/lib/convex/server";
import { getClerkConvexToken } from "@/lib/convex/clerk-token";
import { getDb } from "@/db/client";
import {
  isCourseEligibleForEnrollment,
  isUnitReadyForPublication,
} from "@/lib/education/content";

export type LearningSummaryCourse = {
  enrollmentId: string;
  courseId: string;
  title: string;
  description: string;
  accent: "leaf" | "clay" | "gold";
  version: string;
  unitCount: number;
  completedCount: number;
  progress: number;
  status: "available" | "in-progress" | "completed";
  certificate: string;
  nextUnit: { id: string; title: string } | null;
};

export type LearningSummary = {
  courses: LearningSummaryCourse[];
  totalUnits: number;
  completedUnits: number;
  completedCourses: number;
  certificateCount: number;
  progress: number;
  next: (LearningSummaryCourse & { nextUnit: { id: string; title: string } }) | null;
};

const accents = new Set(["leaf", "clay", "gold"]);

export async function loadLearningSummary(userId: string): Promise<LearningSummary> {
  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    return (await convexQuery(
      api.learningSummary.loadLearningSummary,
      { userId: userId as never },
      token,
    )) as LearningSummary;
  }

  const db = getDb();
  const { and, asc, eq, inArray } = await import("drizzle-orm");
  const {
    certificates,
    courseCompletions,
    courseUnits,
    courses,
    enrollments,
    unitProgress,
  } = await import("@/db/schema");

  const userEnrollments = await db.query.enrollments.findMany({
    where: and(
      eq(enrollments.userId, userId),
      inArray(enrollments.status, ["active", "completed"]),
    ),
    orderBy: [asc(enrollments.enrolledAt)],
  });
  if (!userEnrollments.length) {
    const userCertificates = await db.query.certificates.findMany({
      where: eq(certificates.userId, userId),
      columns: { id: true },
    });
    return emptySummary(userCertificates.length);
  }

  const enrollmentIds = userEnrollments.map(({ id }) => id);
  const courseIds = [...new Set(userEnrollments.map(({ courseId }) => courseId))];
  const [catalogCourses, catalogUnits, progressRows, completions, userCertificates] =
    await Promise.all([
      db.query.courses.findMany({ where: inArray(courses.id, courseIds) }),
      db.query.courseUnits.findMany({
        where: inArray(courseUnits.courseId, courseIds),
        orderBy: [asc(courseUnits.position)],
      }),
      db.query.unitProgress.findMany({
        where: inArray(unitProgress.enrollmentId, enrollmentIds),
      }),
      db.query.courseCompletions.findMany({
        where: and(
          inArray(courseCompletions.enrollmentId, enrollmentIds),
          eq(courseCompletions.eligible, true),
        ),
      }),
      db.query.certificates.findMany({
        where: eq(certificates.userId, userId),
        columns: { id: true, completionId: true, status: true },
      }),
    ]);

  const courseById = new Map(catalogCourses.map((course) => [course.id, course]));
  const unitsByCourse = new Map<string, typeof catalogUnits>();
  for (const unit of catalogUnits) {
    const units = unitsByCourse.get(unit.courseId) ?? [];
    units.push(unit);
    unitsByCourse.set(unit.courseId, units);
  }
  const progressByEnrollment = new Map<string, Set<string>>();
  for (const row of progressRows) {
    const completed = progressByEnrollment.get(row.enrollmentId) ?? new Set<string>();
    completed.add(row.unitId);
    progressByEnrollment.set(row.enrollmentId, completed);
  }
  const completionByEnrollment = new Map(
    completions.map((completion) => [completion.enrollmentId, completion]),
  );
  const certificateByCompletion = new Map(
    userCertificates.map((certificate) => [certificate.completionId, certificate]),
  );

  const summaryCourses: LearningSummaryCourse[] = [];
  for (const enrollment of userEnrollments) {
    const course = courseById.get(enrollment.courseId);
    const rawUnits = unitsByCourse.get(enrollment.courseId) ?? [];
    if (!course || course.version !== enrollment.courseVersion) continue;
    const validUnits = rawUnits.filter((unit) => isUnitReadyForPublication(unit.content));
    if (
      !isCourseEligibleForEnrollment({
        course,
        contents: rawUnits.map((unit) => unit.content),
      }) ||
      validUnits.length === 0
    ) continue;

    const completedIds = progressByEnrollment.get(enrollment.id) ?? new Set<string>();
    const validIds = new Set(validUnits.map((unit) => unit.id));
    const completedCount = [...completedIds].filter((id) => validIds.has(id)).length;
    const nextUnit = validUnits.find((unit) => !completedIds.has(unit.id));
    const done = completedCount === validUnits.length;
    const completion = completionByEnrollment.get(enrollment.id);
    const certificate = completion
      ? certificateByCompletion.get(completion.id)
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
      enrollmentId: enrollment.id,
      courseId: course.id,
      title: course.title,
      description: course.description,
      accent: accents.has(course.accent)
        ? (course.accent as LearningSummaryCourse["accent"])
        : "leaf",
      version: course.version,
      unitCount: validUnits.length,
      completedCount,
      progress: Math.round((completedCount / validUnits.length) * 100),
      status: done ? "completed" : completedCount > 0 ? "in-progress" : "available",
      certificate: certificateLabel,
      nextUnit: nextUnit ? { id: nextUnit.id, title: nextUnit.title } : null,
    });
  }

  const totalUnits = summaryCourses.reduce((count, course) => count + course.unitCount, 0);
  const completedUnits = summaryCourses.reduce((count, course) => count + course.completedCount, 0);
  const completedCourses = summaryCourses.filter((course) => course.status === "completed").length;
  const next = summaryCourses.find((course) => course.nextUnit) as
    | (LearningSummaryCourse & { nextUnit: { id: string; title: string } })
    | undefined;

  return {
    courses: summaryCourses,
    totalUnits,
    completedUnits,
    completedCourses,
    certificateCount: userCertificates.length,
    progress: totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100),
    next: next ?? null,
  };
}

function emptySummary(certificateCount: number): LearningSummary {
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
