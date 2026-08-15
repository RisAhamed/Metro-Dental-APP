CREATE TABLE "surgery_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surgery_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sunday_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sunday_tasks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "surgery_type_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "surgery_type_name" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "referred_by_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "referred_by_name" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_referral" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "chief_doctor_revenue" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "referred_patient_id" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "referred_patient_name" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "surgery_type_id" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "surgery_type_name" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "chief_doctor_revenue" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "week_start_date" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "week_end_date" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "task_type_id" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "task_type_name" text;--> statement-breakpoint
ALTER TABLE "incentive_records" ADD COLUMN "patient_id" text;