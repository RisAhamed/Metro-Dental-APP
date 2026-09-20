CREATE TABLE "drugs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_strength" text,
	"default_strength_unit" text,
	"default_duration" text,
	"default_duration_unit" text,
	"default_frequency" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"clinic_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drugs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "file_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clinic_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "prescription_templates" (
	"template_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"clinic_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	"medicines" jsonb NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_files" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "medicines" jsonb DEFAULT '[]'::jsonb NOT NULL;