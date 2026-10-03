CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"completion_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"sha256" char(64) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pending_tx_hash" text,
	"pending_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_status_check" CHECK ("certificates"."status" in ('pending', 'anchored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "course_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"course_version" text NOT NULL,
	"policy_version" text NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"eligible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{"status":"pending"}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_status_check" CHECK ("courses"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"course_version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_status_check" CHECK ("enrollments"."status" in ('active', 'completed', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "unit_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_action_check";--> statement-breakpoint
ALTER TABLE "usage_events" DROP CONSTRAINT "usage_events_type_check";--> statement-breakpoint
ALTER TABLE "anchors" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "anchors" ADD COLUMN "certificate_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "certificate_id" uuid;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_completion_id_course_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."course_completions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_units" ADD CONSTRAINT "course_units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_progress" ADD CONSTRAINT "unit_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_progress" ADD CONSTRAINT "unit_progress_unit_id_course_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."course_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_public_id_uidx" ON "certificates" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_completion_uidx" ON "certificates" USING btree ("completion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_sha256_uidx" ON "certificates" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "certificates_user_created_idx" ON "certificates" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "certificates_status_pending_idx" ON "certificates" USING btree ("status","pending_at");--> statement-breakpoint
CREATE UNIQUE INDEX "course_completions_enrollment_uidx" ON "course_completions" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "course_completions_eligible_idx" ON "course_completions" USING btree ("eligible");--> statement-breakpoint
CREATE UNIQUE INDEX "course_units_course_position_uidx" ON "course_units" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "course_units_course_id_idx" ON "course_units" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_version_uidx" ON "courses" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_user_course_version_uidx" ON "enrollments" USING btree ("user_id","course_id","course_version");--> statement-breakpoint
CREATE INDEX "enrollments_user_id_idx" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_progress_enrollment_unit_uidx" ON "unit_progress" USING btree ("enrollment_id","unit_id");--> statement-breakpoint
CREATE INDEX "unit_progress_enrollment_idx" ON "unit_progress" USING btree ("enrollment_id");--> statement-breakpoint
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anchors_certificate_id_uidx" ON "anchors" USING btree ("certificate_id");--> statement-breakpoint
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_exactly_one_reference_check" CHECK (("anchors"."document_id" is not null and "anchors"."certificate_id" is null) or ("anchors"."document_id" is null and "anchors"."certificate_id" is not null));--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_action_check" CHECK ("audit_events"."action" in (
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
      ));--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_type_check" CHECK ("usage_events"."type" in ('upload', 'anchor', 'download', 'verify', 'certificate'));