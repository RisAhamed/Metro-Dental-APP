CREATE TABLE "patient_files" (
	"file_id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"file_name" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_type" text,
	"file_size" text,
	"notes" text,
	"visit_id" text,
	"uploaded_by" text NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
