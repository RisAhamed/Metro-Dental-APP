CREATE TYPE "public"."payment_mode" AS ENUM('CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"log_id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"date_string" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text,
	"related_entity_type" text,
	"related_entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"visit_id" text,
	"notes" text,
	"recorded_by" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
