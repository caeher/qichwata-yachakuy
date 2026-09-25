import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  monthlyAnchorsIncluded: integer("monthly_anchors_included").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    planId: uuid("plan_id").references(() => plans.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_clerk_user_id_uidx").on(table.clerkUserId),
    index("users_plan_id_idx").on(table.planId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    status: text("status").notNull().default("draft"),
    pendingTxHash: text("pending_tx_hash"),
    pendingAt: timestamp("pending_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "documents_status_check",
      sql`${table.status} in ('draft', 'pending', 'anchored', 'failed')`,
    ),
    index("documents_sha256_idx").on(table.sha256),
    index("documents_user_id_idx").on(table.userId),
    index("documents_user_active_idx")
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    version: text("version").notNull(),
    status: text("status").notNull().default("draft"),
    demo: boolean("demo").notNull().default(false),
    level: text("level").notNull().default("beginner"),
    accent: text("accent").notNull().default("leaf"),
    estimatedDurationMinutes: integer("estimated_duration_minutes")
      .notNull()
      .default(0),
    enrollmentEnabled: boolean("enrollment_enabled").notNull().default(false),
    completionPolicyVersion: text("completion_policy_version")
      .notNull()
      .default("pending-v1"),
    completionPolicyStatus: text("completion_policy_status")
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("courses_slug_version_uidx").on(table.slug, table.version),
    check(
      "courses_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "courses_accent_check",
      sql`${table.accent} in ('leaf', 'clay', 'gold')`,
    ),
    check(
      "courses_level_check",
      sql`${table.level} in ('beginner', 'intermediate', 'advanced')`,
    ),
    check(
      "courses_estimated_duration_check",
      sql`${table.estimatedDurationMinutes} >= 0`,
    ),
    check(
      "courses_completion_policy_status_check",
      sql`${table.completionPolicyStatus} in ('pending', 'approved')`,
    ),
    index("courses_status_idx").on(table.status),
  ],
);

export const courseUnits = pgTable(
  "course_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull().default({ status: "pending" }),
  },
  (table) => [
    uniqueIndex("course_units_course_position_uidx").on(
      table.courseId,
      table.position,
    ),
    index("course_units_course_id_idx").on(table.courseId),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    courseVersion: text("course_version").notNull(),
    status: text("status").notNull().default("active"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("enrollments_user_course_version_uidx").on(
      table.userId,
      table.courseId,
      table.courseVersion,
    ),
    check(
      "enrollments_status_check",
      sql`${table.status} in ('active', 'completed', 'withdrawn')`,
    ),
    index("enrollments_user_id_idx").on(table.userId),
  ],
);

export const unitProgress = pgTable(
  "unit_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => courseUnits.id),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("unit_progress_enrollment_unit_uidx").on(
      table.enrollmentId,
      table.unitId,
    ),
    index("unit_progress_enrollment_idx").on(table.enrollmentId),
  ],
);

export const courseCompletions = pgTable(
  "course_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    courseVersion: text("course_version").notNull(),
    policyVersion: text("policy_version").notNull(),
    validatedAt: timestamp("validated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eligible: boolean("eligible").notNull().default(false),
  },
  (table) => [
    uniqueIndex("course_completions_enrollment_uidx").on(table.enrollmentId),
    index("course_completions_eligible_idx").on(table.eligible),
  ],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: uuid("public_id").defaultRandom().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    completionId: uuid("completion_id")
      .notNull()
      .references(() => courseCompletions.id),
    snapshot: jsonb("snapshot").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    sha256: char("sha256", { length: 64 }).notNull(),
    status: text("status").notNull().default("pending"),
    pendingTxHash: text("pending_tx_hash"),
    pendingAt: timestamp("pending_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("certificates_public_id_uidx").on(table.publicId),
    uniqueIndex("certificates_completion_uidx").on(table.completionId),
    uniqueIndex("certificates_sha256_uidx").on(table.sha256),
    check(
      "certificates_status_check",
      sql`${table.status} in ('pending', 'anchored', 'failed')`,
    ),
    index("certificates_user_created_idx").on(table.userId, table.createdAt),
    index("certificates_status_pending_idx").on(table.status, table.pendingAt),
  ],
);

// Export-only inventory from the retired object storage system. No runtime
// feature reads or writes these object references.
export const legacyObjectInventory = pgTable(
  "legacy_object_inventory",
  {
    documentId: uuid("document_id").primaryKey(),
    userId: uuid("user_id").notNull(),
    objectKey: text("object_key").notNull(),
    originalMimeType: text("original_mime_type").notNull(),
    originalSizeBytes: bigint("original_size_bytes", {
      mode: "number",
    }).notNull(),
    inventoriedAt: timestamp("inventoried_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("legacy_object_inventory_user_id_idx").on(table.userId)],
);

export const anchors = pgTable(
  "anchors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").references(() => documents.id),
    certificateId: uuid("certificate_id").references(() => certificates.id),
    network: text("network").notNull(),
    txHash: text("tx_hash").notNull(),
    ownerPublicKey: text("owner_public_key"),
    ledger: bigint("ledger", { mode: "number" }),
    contractId: text("contract_id"),
    anchoredAt: timestamp("anchored_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    feeXlm: numeric("fee_xlm", { precision: 20, scale: 7 }),
  },
  (table) => [
    check(
      "anchors_network_check",
      sql`${table.network} in ('testnet', 'mainnet')`,
    ),
    check(
      "anchors_exactly_one_reference_check",
      sql`(${table.documentId} is not null and ${table.certificateId} is null) or (${table.documentId} is null and ${table.certificateId} is not null)`,
    ),
    uniqueIndex("anchors_tx_hash_uidx").on(table.txHash),
    index("anchors_document_id_idx").on(table.documentId),
    uniqueIndex("anchors_certificate_id_uidx").on(table.certificateId),
  ],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "usage_events_type_check",
      sql`${table.type} in ('upload', 'anchor', 'download', 'verify', 'certificate')`,
    ),
    index("usage_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    documentId: uuid("document_id"),
    certificateId: uuid("certificate_id"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "audit_events_action_check",
      sql`${table.action} in (
        'anchor_submit',
        'anchor_settled',
        'anchor_failed',
        'anchor_quota',
        'anchor_reconcile_missing_tx',
        'document_delete',
        'account_erasure'
        ,'certificate_issue'
        ,'certificate_anchor_submit'
        ,'certificate_anchor_settled'
        ,'certificate_anchor_failed'
        ,'certificate_reconcile'
      )`,
    ),
    index("audit_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DbUser = typeof users.$inferSelect;
export type DbDocument = typeof documents.$inferSelect;
export type DbCertificate = typeof certificates.$inferSelect;
