import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthDb } from "@/lib/auth/provision-user";
import {
  certificates,
  auditEvents,
  courseCompletions,
  courseUnits,
  courses,
  enrollments,
  unitProgress,
} from "@/db/schema";
import { isCourseEligibleForEnrollment } from "@/lib/education/content";
import {
  canonicalCertificateJson,
  hashCertificatePayload,
} from "@/lib/certificates/canonical";

export type CompletionDecision =
  | { eligible: true; policyVersion: string }
  | { eligible: false; reason: "criteria_pending" };

export type CompletionPolicy = (input: {
  progressCount: number;
  unitCount: number;
  courseVersion: string;
}) => CompletionDecision;

/** Production remains closed until academic criteria are approved. */
export const pendingCompletionPolicy: CompletionPolicy = () => ({
  eligible: false,
  reason: "criteria_pending",
});

export class EducationError extends Error {
  constructor(
    readonly code: "not_found" | "course_unavailable" | "criteria_pending",
  ) {
    super(code);
    this.name = "EducationError";
  }
}

export async function enrollInCourse(
  db: AuthDb,
  input: { userId: string; courseId: string },
) {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, input.courseId),
  });
  if (!course) throw new EducationError("course_unavailable");
  const content = await db.query.courseUnits.findMany({
    where: eq(courseUnits.courseId, course.id),
  });
  if (
    !isCourseEligibleForEnrollment({
      course,
      contents: content.map((unit) => unit.content),
    })
  )
    throw new EducationError("course_unavailable");
  const [row] = await db
    .insert(enrollments)
    .values({
      userId: input.userId,
      courseId: course.id,
      courseVersion: course.version,
    })
    .onConflictDoNothing({
      target: [
        enrollments.userId,
        enrollments.courseId,
        enrollments.courseVersion,
      ],
    })
    .returning();
  if (row) return row;
  const existing = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, input.userId),
      eq(enrollments.courseId, course.id),
      eq(enrollments.courseVersion, course.version),
    ),
  });
  if (!existing) throw new Error("enrollment_persist_failed");
  return existing;
}

export async function completeUnit(
  db: AuthDb,
  input: { userId: string; enrollmentId: string; unitId: string },
) {
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.id, input.enrollmentId),
      eq(enrollments.userId, input.userId),
      eq(enrollments.status, "active"),
    ),
  });
  if (!enrollment) throw new EducationError("not_found");
  const unit = await db.query.courseUnits.findFirst({
    where: and(
      eq(courseUnits.id, input.unitId),
      eq(courseUnits.courseId, enrollment.courseId),
    ),
  });
  if (!unit) throw new EducationError("not_found");
  const [row] = await db
    .insert(unitProgress)
    .values({ enrollmentId: enrollment.id, unitId: unit.id })
    .onConflictDoNothing({
      target: [unitProgress.enrollmentId, unitProgress.unitId],
    })
    .returning();
  return (
    row ??
    (await db.query.unitProgress.findFirst({
      where: and(
        eq(unitProgress.enrollmentId, enrollment.id),
        eq(unitProgress.unitId, unit.id),
      ),
    }))
  );
}

/**
 * Commits completion and its certificate intent together. The policy is
 * injected by tests/dev fixtures; production callers use the closed policy.
 */
export async function finalizeEnrollment(
  db: AuthDb,
  input: {
    userId: string;
    enrollmentId: string;
    issuer: string;
    policy?: CompletionPolicy;
    now?: Date;
  },
) {
  const policy = input.policy ?? pendingCompletionPolicy;
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.id, input.enrollmentId),
          eq(enrollments.userId, input.userId),
        ),
      )
      .for("update");
    if (!enrollment) throw new EducationError("not_found");
    const course = await tx.query.courses.findFirst({
      where: and(
        eq(courses.id, enrollment.courseId),
        eq(courses.version, enrollment.courseVersion),
      ),
    });
    if (!course) throw new EducationError("course_unavailable");
    const units = await tx
      .select({ id: courseUnits.id, content: courseUnits.content })
      .from(courseUnits)
      .where(eq(courseUnits.courseId, course.id));
    if (
      !isCourseEligibleForEnrollment({
        course,
        contents: units.map((unit) => unit.content),
      })
    )
      throw new EducationError("course_unavailable");
    const progress = await tx
      .select({ id: unitProgress.id })
      .from(unitProgress)
      .where(eq(unitProgress.enrollmentId, enrollment.id));
    const decision = policy({
      progressCount: progress.length,
      unitCount: units.length,
      courseVersion: course.version,
    });
    if (!decision.eligible) throw new EducationError("criteria_pending");
    if (units.length === 0 || progress.length !== units.length)
      throw new EducationError("criteria_pending");

    const prior = await tx.query.courseCompletions.findFirst({
      where: eq(courseCompletions.enrollmentId, enrollment.id),
    });
    if (prior) {
      const priorCertificate = await tx.query.certificates.findFirst({
        where: eq(certificates.completionId, prior.id),
      });
      return { completion: prior, certificate: priorCertificate ?? null };
    }

    const [completion] = await tx
      .insert(courseCompletions)
      .values({
        enrollmentId: enrollment.id,
        courseVersion: course.version,
        policyVersion: decision.policyVersion,
        validatedAt: now,
        eligible: true,
      })
      .returning();

    const publicId = randomUUID();
    const issuedAt = now;
    const snapshot = {
      schemaVersion: 1,
      certificateId: publicId,
      beneficiaryRef: publicId,
      issuer: input.issuer.normalize("NFC").trim(),
      course: {
        slug: course.slug,
        version: course.version,
        title: course.title.normalize("NFC").trim(),
      },
      completion: {
        policyVersion: decision.policyVersion,
        completedAt: now.toISOString(),
      },
      issuedAt: issuedAt.toISOString(),
    };
    const canonical = canonicalCertificateJson({
      certificateId: publicId,
      beneficiaryRef: publicId,
      issuer: snapshot.issuer,
      course: snapshot.course,
      policyVersion: decision.policyVersion,
      completedAt: now,
      issuedAt,
    });
    const [certificate] = await tx
      .insert(certificates)
      .values({
        publicId,
        userId: input.userId,
        completionId: completion.id,
        snapshot,
        schemaVersion: 1,
        sha256: hashCertificatePayload(canonical),
        status: "pending",
      })
      .returning();
    await tx.insert(auditEvents).values({
      userId: input.userId,
      action: "certificate_issue",
      certificateId: certificate.id,
      meta: { sha256: certificate.sha256 },
    });
    await tx
      .update(enrollments)
      .set({ status: "completed" })
      .where(eq(enrollments.id, enrollment.id));
    return { completion, certificate };
  });
}
