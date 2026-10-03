ALTER TABLE "courses" ADD COLUMN "level" text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "accent" text DEFAULT 'leaf' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "estimated_duration_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "enrollment_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "completion_policy_version" text DEFAULT 'pending-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "completion_policy_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_accent_check" CHECK ("courses"."accent" in ('leaf', 'clay', 'gold'));--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_completion_policy_status_check" CHECK ("courses"."completion_policy_status" in ('pending', 'approved'));