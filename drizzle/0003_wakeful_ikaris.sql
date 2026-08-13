CREATE TYPE "public"."appt_status" AS ENUM('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TABLE "appointment_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280',
	"clinic_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"appointment_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"doctor_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"category_id" text,
	"category_name" text,
	"category_color" text,
	"status" "appt_status" DEFAULT 'SCHEDULED' NOT NULL,
	"is_walk_in" boolean DEFAULT false NOT NULL,
	"token_number" text,
	"abha_id" text,
	"planned_procedures" text,
	"notes" text,
	"visit_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "appointment_slots" (
	"slot_key" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"reminder_id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"title" text NOT NULL,
	"doctor_id" text,
	"doctor_name" text,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"token_id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"date_string" text NOT NULL,
	"token_number" integer NOT NULL,
	"patient_id" text,
	"patient_name" text,
	"appointment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
