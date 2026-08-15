CREATE TYPE "public"."po_status" AS ENUM('PENDING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "vendors" (
	"vendor_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"contact_person" text,
	"user_id" text,
	"clinic_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"item_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"quantity_in_stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 10,
	"unit_price" numeric(10, 2) DEFAULT '0',
	"clinic_id" text NOT NULL,
	"vendor_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "inventory_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"po_number" text NOT NULL,
	"vendor_id" text NOT NULL,
	"vendor_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"delivered_date" timestamp with time zone,
	"status" "po_status" DEFAULT 'PENDING' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"returns" jsonb DEFAULT '[]'::jsonb,
	"invoice_file_id" text,
	"total_order_amount" numeric(10, 2) DEFAULT '0',
	"total_return_amount" numeric(10, 2) DEFAULT '0',
	"net_amount" numeric(10, 2) DEFAULT '0',
	"amount_paid" numeric(10, 2) DEFAULT '0',
	"balance_due" numeric(10, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'UNPAID',
	"payment_history" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
