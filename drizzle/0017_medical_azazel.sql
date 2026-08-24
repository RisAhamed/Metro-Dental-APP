ALTER TABLE "patients" ADD COLUMN "past_diseases" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "allergies" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "previous_medicine_intake" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "baseline_vitals" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "general_notes" text;