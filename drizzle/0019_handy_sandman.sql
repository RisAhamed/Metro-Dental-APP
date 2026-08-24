CREATE TYPE "public"."invoice_payment_status" AS ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID');--> statement-breakpoint
CREATE TABLE "invoices" (
	"invoice_id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"plan_id" text,
	"visit_id" text,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"procedures" jsonb NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_status" "invoice_payment_status" DEFAULT 'UNPAID' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
