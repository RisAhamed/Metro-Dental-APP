CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'VENDOR');--> statement-breakpoint
CREATE TABLE "clinics" (
	"clinic_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "clinic_settings" (
	"clinic_id" text PRIMARY KEY NOT NULL,
	"general_doctor_base_daily_pay" numeric(10, 2) DEFAULT '2000',
	"general_doctor_daily_work_hours" numeric(4, 1) DEFAULT '7',
	"general_doctor_daily_revenue_target" numeric(10, 2) DEFAULT '20000',
	"general_doctor_monthly_revenue_target" numeric(10, 2) DEFAULT '600000',
	"general_doctor_monthly_target_cap" numeric(10, 2) DEFAULT '100000',
	"assistant_monthly_base_pay" numeric(10, 2) DEFAULT '18000',
	"assistant_daily_work_hours" numeric(4, 1) DEFAULT '8',
	"working_days_per_month" numeric(2, 0) DEFAULT '26',
	"referral_incentive_amount" numeric(10, 2) DEFAULT '1500',
	"weekly_attendance_bonus_amount" numeric(10, 2) DEFAULT '500',
	"working_hours" jsonb DEFAULT '{"start":"09:00","end":"20:00"}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"primary_clinic_id" text,
	"clinic_ids" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"lab_id" text,
	"vendor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
