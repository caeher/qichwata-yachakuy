import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Id } from "@/convex/_generated/dataModel";
import { api, convexConfigured, convexMutation } from "@/lib/convex/server";
import { getClerkConvexToken } from "@/lib/convex/clerk-token";
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
import {
  isCourseEligibleForEnrollment,
  isCourseUnitContent,
} from "@/lib/education/content";
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
    readonly code:
      | "not_found"
      | "course_unavailable"
      | "criteria_pending"
      | "evidence_required"
      | "evidence_incorrect",
  ) {
    super(code);
    this.name = "EducationError";
  }
}

export async function enrollInCourse(
  db: AuthDb,
  input: { userId: string; courseId: string },
) {
  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    const enrollment = await convexMutation(
      api.education.enroll,
      { courseId: input.courseId as Id<"courses"> },
      token,
    );
    if (!enrollment) throw new Error("enrollment_persist_failed");
    return {
      id: enrollment._id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      courseVersion: enrollment.courseVersion,
      status: enrollment.status,
      enrolledAt: new Date(enrollment.enrolledAt),
    };
  }

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
  input: {
    userId: string;
    enrollmentId: string;
    unitId: string;
    answers: string[];
  },
) {
  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    try {
      return await convexMutation(
        api.education.completeUnit,
        {
          enrollmentId: input.enrollmentId as Id<"enrollments">,
          unitId: input.unitId as Id<"courseUnits">,
          answers: input.answers,
        },
        token,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not_found")) {
          throw new EducationError("not_found");
        }
        if (error.message.includes("evidence_required")) {
          throw new EducationError("evidence_required");
        }
        if (error.message.includes("evidence_incorrect")) {
          throw new EducationError("evidence_incorrect");
        }
      }
      throw error;
    }
  }

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
  const content = isCourseUnitContent(unit.content) ? unit.content : null;
  const items = content?.activity.items;
  if (!items?.length || input.answers.length !== items.length)
    throw new EducationError("evidence_required");
  const normalize = (value: string) =>
    value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  const answersAreCorrect = items.every((item, index) => {
    const provided = normalize(input.answers[index] ?? "");
    const accepted = [item.answer, ...(item.acceptedAnswers ?? [])].map(
      normalize,
    );
    return provided.length > 0 && accepted.includes(provided);
  });
  if (!answersAreCorrect) throw new EducationError("evidence_incorrect");
  const [row] = await db
    .insert(unitProgress)
    .values({ enrollmentId: enrollment.id, unitId: unit.id })
    .onConflictDoNothing({
      target: [unitProgress.enrollmentId, unitProgress.unitId],
    })
    .returning();
  const progress =
    row ??
    (await db.query.unitProgress.findFirst({
      where: and(
        eq(unitProgress.enrollmentId, enrollment.id),
        eq(unitProgress.unitId, unit.id),
      ),
    }));
  return { progress, feedback: items.map((item) => item.feedback) };
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
  if (convexConfigured()) {
    const token = await getClerkConvexToken();
    try {
      const outcome = await convexMutation(
        api.education.finalizeEnrollment,
        {
          enrollmentId: input.enrollmentId as Id<"enrollments">,
          issuer: input.issuer,
        },
        token,
      );
      return {
        completion: outcome.completion
          ? {
              id: outcome.completion._id,
              enrollmentId: outcome.completion.enrollmentId,
              courseVersion: outcome.completion.courseVersion,
              policyVersion: outcome.completion.policyVersion,
              validatedAt: new Date(outcome.completion.validatedAt),
              eligible: outcome.completion.eligible,
            }
          : null,
        certificate: outcome.certificate
          ? {
              id: outcome.certificate._id,
              publicId: outcome.certificate.publicId,
              userId: outcome.certificate.userId,
              completionId: outcome.certificate.completionId,
              snapshot: outcome.certificate.snapshot,
              schemaVersion: outcome.certificate.schemaVersion,
              sha256: outcome.certificate.sha256,
              status: outcome.certificate.status,
              pendingTxHash: outcome.certificate.pendingTxHash ?? null,
              pendingAt: outcome.certificate.pendingAt
                ? new Date(outcome.certificate.pendingAt)
                : null,
              createdAt: new Date(outcome.certificate.createdAt),
            }
          : null,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("criteria_pending")) {
          throw new EducationError("criteria_pending");
        }
        if (error.message.includes("not_found")) {
          throw new EducationError("not_found");
        }
        if (error.message.includes("course_unavailable")) {
          throw new EducationError("course_unavailable");
        }
      }
      throw error;
    }
  }

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
