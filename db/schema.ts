import { sql } from "drizzle-orm";
import {
  bigint,
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

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    storageLimitBytes: bigint("storage_limit_bytes", {
      mode: "number",
    }).notNull(),
    maxUploadBytes: bigint("max_upload_bytes", { mode: "number" }).notNull(),
    monthlyAnchorsIncluded: integer("monthly_anchors_included").notNull(),
    pricePerExtraAnchorCents: integer("price_per_extra_anchor_cents"),
    pricePerGbCents: integer("price_per_gb_cents"),
  },
  (table) => [
    check(
      "plans_slug_check",
      sql`${table.slug} in ('free', 'pro', 'enterprise')`,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
      .notNull()
      .default(0),
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
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    storageKey: text("storage_key").notNull(),
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

export const anchors = pgTable(
  "anchors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    network: text("network").notNull(),
    txHash: text("tx_hash").notNull(),
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
    uniqueIndex("anchors_tx_hash_uidx").on(table.txHash),
    index("anchors_document_id_idx").on(table.documentId),
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
    bytesDelta: bigint("bytes_delta", { mode: "number" }).notNull(),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "usage_events_type_check",
      sql`${table.type} in ('upload', 'anchor', 'download', 'verify')`,
    ),
    index("usage_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: text("status").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'canceled', 'past_due')`,
    ),
    uniqueIndex("subscriptions_user_id_uidx").on(table.userId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    documentId: uuid("document_id"),
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

export type DbPlan = typeof plans.$inferSelect;
export type DbUser = typeof users.$inferSelect;
export type DbDocument = typeof documents.$inferSelect;
