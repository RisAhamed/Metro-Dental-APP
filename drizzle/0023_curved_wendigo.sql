ALTER TYPE "public"."appt_status" ADD VALUE 'WAITING' BEFORE 'IN_PROGRESS';--> statement-breakpoint
ALTER TYPE "public"."appt_status" ADD VALUE 'ENGAGED' BEFORE 'IN_PROGRESS';--> statement-breakpoint
CREATE TABLE "referral_subtypes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_subtypes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "referral_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_relationships_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "referral_source_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "referral_sub_type" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "referred_relation" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "referred_patient_id" text;