ALTER TABLE "documents" DROP CONSTRAINT "documents_status_check";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "pending_tx_hash" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "pending_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_status_check" CHECK ("documents"."status" in ('draft', 'pending', 'anchored', 'failed'));