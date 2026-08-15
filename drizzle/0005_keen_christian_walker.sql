CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."correction_type" AS ENUM('MISSED_CLOCK_IN', 'MISSED_CLOCK_OUT', 'WRONG_TIME', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."half_day_slot" AS ENUM('MORNING', 'AFTERNOON');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('FULL_DAY', 'HALF_DAY', 'EMERGENCY', 'SICK', 'PERMISSION');--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"record_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"clinic_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"date_string" text NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"hours_worked" numeric(5, 2) DEFAULT '0',
	"status" "attendance_status" DEFAULT 'ABSENT' NOT NULL,
	"recorded_by" text NOT NULL,
	"has_correction_request" boolean DEFAULT false,
	"correction_request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"correction_id" text PRIMARY KEY NOT NULL,
	"attendance_record_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"requester_role" text NOT NULL,
	"clinic_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"date_string" text NOT NULL,
	"request_type" "correction_type" NOT NULL,
	"original_clock_in" timestamp with time zone,
	"original_clock_out" timestamp with time zone,
	"requested_clock_in" timestamp with time zone,
	"requested_clock_out" timestamp with time zone,
	"reason" text NOT NULL,
	"status" "correction_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"leave_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"requester_role" text NOT NULL,
	"clinic_id" text NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"total_days" numeric(3, 1) NOT NULL,
	"half_day_slot" "half_day_slot",
	"reason" text,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"reviewed_at" timestamp with time zone,
	"review_notes" text
);
