CREATE TYPE "public"."visit_status" AS ENUM('DRAFT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "visits" (
	"visit_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"visit_date" timestamp with time zone NOT NULL,
	"visit_type" "visit_type" DEFAULT 'NEW_PROBLEM',
	"chief_complaint" text,
	"diagnosis" text,
	"treatment_given" text,
	"injection_given" boolean DEFAULT false,
	"doctors_involved" jsonb DEFAULT '[]'::jsonb,
	"dental_chart_entries" jsonb DEFAULT '[]'::jsonb,
	"vital_signs" jsonb,
	"treatment_cost" numeric(10, 2) DEFAULT '0',
	"amount_paid" numeric(10, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'UNPAID',
	"payments" jsonb DEFAULT '[]'::jsonb,
	"additional_notes" text,
	"next_visit_date" timestamp with time zone,
	"status" "visit_status" DEFAULT 'DRAFT',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"plan_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"title" text,
	"status" "plan_status" DEFAULT 'DRAFT',
	"procedures" jsonb DEFAULT '[]'::jsonb,
	"total_cost" numeric(10, 2) DEFAULT '0',
	"total_discount" numeric(10, 2) DEFAULT '0',
	"grand_total" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"share_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "procedures_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_cost" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"clinic_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
