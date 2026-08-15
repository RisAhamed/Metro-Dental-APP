ALTER TABLE "sunday_tasks" ALTER COLUMN "amount" SET DEFAULT '250';--> statement-breakpoint
ALTER TABLE "sunday_tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "sunday_tasks" ADD COLUMN "created_by" text NOT NULL;