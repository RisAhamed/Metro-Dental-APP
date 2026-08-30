CREATE TABLE "clinical_note_lookups" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"clinic_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notes" (
	"note_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"doctor_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"chief_complaints" jsonb DEFAULT '[]'::jsonb,
	"observations" jsonb DEFAULT '[]'::jsonb,
	"diagnoses" jsonb DEFAULT '[]'::jsonb,
	"investigations" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
