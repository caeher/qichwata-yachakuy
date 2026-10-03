export const COURSE_CONTENT_SCHEMA_VERSION = 1 as const;

export type LessonKind = "vocabulary" | "phrases" | "practice";
export type ReviewStatus = "draft" | "reviewed";

export type CourseUnitContent = {
  schemaVersion: typeof COURSE_CONTENT_SCHEMA_VERSION;
  status: "draft" | "published";
  kind: LessonKind;
  durationMinutes: number;
  objectives: string[];
  reading: { title: string; paragraphs: string[] };
  vocabulary: { term: string; meaning: string; note?: string }[];
  phrases: { text: string; translation: string; context: string }[];
  examples: { prompt: string; response: string; explanation: string }[];
  activity: {
    title: string;
    instructions: string[];
    items: {
      prompt: string;
      options?: string[];
      answer: string;
      acceptedAnswers?: string[];
      feedback: string;
    }[];
    modality: "text" | "audio";
    audioStatus: "not_required" | "planned" | "reviewed";
  };
  review: {
    status: ReviewStatus;
    reviewedBy: string | null;
    reviewedAt: string | null;
    /** Record unresolved editorial checks; never imply review while status is draft. */
    notes: string[];
  };
  sources: {
    status: "pending" | "documented";
    items: {
      sourceId?: string;
      citation: string;
      url?: string;
      license: string;
      usedFor: string;
      supportType?: "direct" | "pedagogical-proposal";
      locator?: {
        pdfPage: number;
        printedPage: number | null;
        heading: string;
        headword?: string;
        sense?: string;
        usageMark?: string;
      };
    }[];
    requirements: string[];
  };
  regionalVariant: {
    /** `specified` records an editorial choice; it does not certify linguistic review. */
    status: "undetermined" | "specified";
    name: string | null;
    notes: string;
  };
  authorship: {
    status: "pending" | "attributed";
    author: string | null;
    license: string | null;
  };
  source: { system: "yachay-convex"; moduleSlug: string; lessonId: string };
};

export function isCourseUnitContent(
  value: unknown,
): value is CourseUnitContent {
  if (!value || typeof value !== "object") return false;
  const content = value as Partial<CourseUnitContent>;
  return (
    content.schemaVersion === COURSE_CONTENT_SCHEMA_VERSION &&
    (content.status === "draft" || content.status === "published") &&
    ["vocabulary", "phrases", "practice"].includes(content.kind ?? "") &&
    Array.isArray(content.objectives) &&
    Array.isArray(content.vocabulary) &&
    Array.isArray(content.phrases) &&
    Array.isArray(content.examples) &&
    content.activity !== null &&
    typeof content.activity === "object" &&
    Array.isArray(content.activity.items) &&
    content.activity.items.every(
      (item) =>
        item &&
        typeof item.prompt === "string" &&
        typeof item.answer === "string" &&
        (item.acceptedAnswers === undefined ||
          (Array.isArray(item.acceptedAnswers) &&
            item.acceptedAnswers.every(
              (answer) => typeof answer === "string",
            ))),
    ) &&
    typeof content.review === "object" &&
    typeof content.sources === "object" &&
    typeof content.regionalVariant === "object" &&
    typeof content.source === "object"
  );
}

export function isUnitReadyForPublication(
  value: unknown,
): value is CourseUnitContent {
  return (
    isCourseUnitContent(value) &&
    value.status === "published" &&
    value.review.status === "reviewed" &&
    Boolean(value.review.reviewedBy && value.review.reviewedAt) &&
    value.sources.status === "documented" &&
    value.sources.items.length > 0 &&
    value.sources.items.every((source) =>
      Boolean(source.citation && source.license),
    ) &&
    value.regionalVariant.status === "specified" &&
    Boolean(value.regionalVariant.name) &&
    value.authorship.status === "attributed" &&
    Boolean(value.authorship.author && value.authorship.license)
  );
}

export function isCourseEligibleForEnrollment(input: {
  course: {
    status: string;
    demo: boolean;
    enrollmentEnabled: boolean;
  };
  contents: unknown[];
}) {
  return (
    input.course.status === "published" &&
    !input.course.demo &&
    input.course.enrollmentEnabled &&
    input.contents.length > 0 &&
    input.contents.every(isUnitReadyForPublication)
  );
}
