CREATE TYPE "public"."lab_order_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."lab_stage_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "labs" (
	"lab_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"contact_person" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"lab_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"visit_id" text,
	"ordered_by_doctor_id" text NOT NULL,
	"ordered_by_doctor_name" text NOT NULL,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"overall_due_date" timestamp with time zone,
	"work_description" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb,
	"status" "lab_order_status" DEFAULT 'PENDING' NOT NULL,
	"attachment_file_ids" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_billing" (
	"order_id" text PRIMARY KEY NOT NULL,
	"stage_costs" jsonb DEFAULT '[]'::jsonb,
	"total_cost" numeric(10, 2) DEFAULT '0',
	"amount_paid" numeric(10, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'UNPAID',
	"clinic_approved" boolean DEFAULT false,
	"clinic_approved_at" timestamp with time zone,
	"clinic_approved_by" text,
	"payment_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notif_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"clinic_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
