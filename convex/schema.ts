import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const courseStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const enrollmentStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("withdrawn"),
);

const certificateStatus = v.union(
  v.literal("pending"),
  v.literal("anchored"),
  v.literal("failed"),
);

const documentStatus = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("anchored"),
  v.literal("failed"),
);

export default defineSchema({
  plans: defineTable({
    monthlyAnchorsIncluded: v.number(),
  }),

  users: defineTable({
    clerkUserId: v.string(),
    email: v.union(v.string(), v.null()),
    planId: v.optional(v.id("plans")),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  courses: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    version: v.string(),
    status: courseStatus,
    demo: v.boolean(),
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
    ),
    accent: v.union(v.literal("leaf"), v.literal("clay"), v.literal("gold")),
    estimatedDurationMinutes: v.number(),
    enrollmentEnabled: v.boolean(),
    completionPolicyVersion: v.string(),
    completionPolicyStatus: v.union(v.literal("pending"), v.literal("approved")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_slug_version", ["slug", "version"]),

  courseUnits: defineTable({
    courseId: v.id("courses"),
    position: v.number(),
    title: v.string(),
    content: v.any(),
  })
    .index("by_course", ["courseId"])
    .index("by_course_position", ["courseId", "position"]),

  enrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    courseVersion: v.string(),
    status: enrollmentStatus,
    enrolledAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_course_version", ["userId", "courseId", "courseVersion"]),

  unitProgress: defineTable({
    enrollmentId: v.id("enrollments"),
    unitId: v.id("courseUnits"),
    completedAt: v.number(),
  })
    .index("by_enrollment", ["enrollmentId"])
    .index("by_enrollment_unit", ["enrollmentId", "unitId"]),

  courseCompletions: defineTable({
    enrollmentId: v.id("enrollments"),
    courseVersion: v.string(),
    policyVersion: v.string(),
    validatedAt: v.number(),
    eligible: v.boolean(),
  }).index("by_enrollment", ["enrollmentId"]),

  certificates: defineTable({
    publicId: v.string(),
    userId: v.id("users"),
    completionId: v.id("courseCompletions"),
    snapshot: v.any(),
    schemaVersion: v.number(),
    sha256: v.string(),
    status: certificateStatus,
    pendingTxHash: v.optional(v.string()),
    pendingAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_sha256", ["sha256"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status_pending", ["status", "pendingAt"])
    .index("by_completion", ["completionId"]),

  documents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    sha256: v.string(),
    status: documentStatus,
    pendingTxHash: v.optional(v.string()),
    pendingAt: v.optional(v.number()),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sha256", ["sha256"])
    .index("by_user", ["userId"]),

  anchors: defineTable({
    documentId: v.optional(v.id("documents")),
    certificateId: v.optional(v.id("certificates")),
    network: v.union(v.literal("testnet"), v.literal("mainnet")),
    txHash: v.string(),
    ownerPublicKey: v.optional(v.string()),
    ledger: v.optional(v.number()),
    contractId: v.optional(v.string()),
    anchoredAt: v.number(),
    feeXlm: v.optional(v.string()),
  })
    .index("by_tx_hash", ["txHash"])
    .index("by_document", ["documentId"])
    .index("by_certificate", ["certificateId"]),

  auditEvents: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    documentId: v.optional(v.id("documents")),
    certificateId: v.optional(v.id("certificates")),
    meta: v.any(),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  usageEvents: defineTable({
    userId: v.id("users"),
    type: v.string(),
    meta: v.any(),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  webhookEvents: defineTable({
    externalId: v.string(),
    eventType: v.string(),
    receivedAt: v.number(),
  }).index("by_external_id", ["externalId"]),

  legacyObjectInventory: defineTable({
    documentId: v.string(),
    userId: v.string(),
    objectKey: v.string(),
    originalMimeType: v.string(),
    originalSizeBytes: v.number(),
    inventoriedAt: v.number(),
  }).index("by_user", ["userId"]),
});
