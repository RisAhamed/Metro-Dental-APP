CREATE TABLE "lab_work_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_stage_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"clinic_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_shades" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex_color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "work_type" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "work_type_id" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "shade" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "shade_id" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "total_amount" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "amount_paid" text;