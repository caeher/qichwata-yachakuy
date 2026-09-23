ALTER TABLE "plans" DROP CONSTRAINT "plans_slug_unique";--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_slug_check";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "price_per_extra_anchor_cents";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "price_per_gb_cents";