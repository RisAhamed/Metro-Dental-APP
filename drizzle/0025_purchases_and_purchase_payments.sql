CREATE TABLE "purchases" (
	"purchase_id" text PRIMARY KEY NOT NULL,
	"purchase_number" text NOT NULL,
	"vendor_id" text NOT NULL,
	"vendor_name" text NOT NULL,
	"clinic_id" text NOT NULL,
	"purchase_date" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_number" text,
	"invoice_file_id" text,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"balance_due" numeric(12, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'UNPAID',
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" text,
	"reference" text,
	"notes" text,
	"recorded_by" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "balance_due" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "payment_status" text DEFAULT 'UNPAID';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "purchase_id" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "last_purchase_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "last_purchase_date" timestamp with time zone;