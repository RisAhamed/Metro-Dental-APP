CREATE TABLE "inventory_consumptions" (
	"consumption_id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"remaining_after" integer NOT NULL,
	"taken_by" text NOT NULL,
	"taken_by_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
