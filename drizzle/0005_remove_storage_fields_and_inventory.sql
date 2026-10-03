-- Keep a database inventory of existing object references before dropping
-- storage metadata. This migration does not delete files or buckets.
CREATE TABLE "legacy_object_inventory" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"original_mime_type" text NOT NULL,
	"original_size_bytes" bigint NOT NULL,
	"inventoried_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "legacy_object_inventory_user_id_idx" ON "legacy_object_inventory" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "legacy_object_inventory" (
	"document_id",
	"user_id",
	"object_key",
	"original_mime_type",
	"original_size_bytes"
)
SELECT "id", "user_id", "storage_key", "mime_type", "size_bytes"
FROM "documents";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "size_bytes";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "storage_key";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "storage_limit_bytes";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "max_upload_bytes";--> statement-breakpoint
ALTER TABLE "usage_events" DROP COLUMN "bytes_delta";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "storage_used_bytes";
