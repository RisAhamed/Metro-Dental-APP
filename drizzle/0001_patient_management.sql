CREATE TYPE "public"."blood_group" AS ENUM('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'B1+');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."relation" AS ENUM('CHILD', 'PARENT', 'BROTHER_SISTER', 'HUSBAND_WIFE', 'GRANDCHILD', 'GRANDPARENT', 'UNCLE_AUNT', 'NEPHEW_NIECE', 'COUSIN');--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"gender" "gender" NOT NULL,
	"date_of_birth" timestamp with time zone,
	"age" integer,
	"blood_group" "blood_group",
	"primary_phone" text NOT NULL,
	"secondary_phone" text,
	"email" text,
	"anniversary" timestamp with time zone,
	"address" jsonb,
	"referred_by_id" text,
	"referred_by_name" text,
	"medical_history" text[] DEFAULT '{}',
	"other_history" text,
	"groups" text[] DEFAULT '{}',
	"family_members" jsonb DEFAULT '[]'::jsonb,
	"language_preference" text DEFAULT 'English',
	"registered_clinic_id" text NOT NULL,
	"primary_doctor_id" text,
	"primary_doctor_name" text,
	"advance_balance" numeric(10, 2) DEFAULT '0',
	"total_due" numeric(10, 2) DEFAULT '0',
	"total_paid" numeric(10, 2) DEFAULT '0',
	"last_visit_date" timestamp with time zone,
	"last_visit_clinic_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"patient_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "patient_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "referral_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clinic_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "medical_conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clinic_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medical_conditions_name_unique" UNIQUE("name")
);
