CREATE TABLE "prescriptions" (
	"prescription_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"doctor_id" text,
	"doctor_name" text,
	"drugs" jsonb NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
