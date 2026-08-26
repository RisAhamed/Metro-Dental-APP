ALTER TABLE "clinic_settings" ADD COLUMN "receptionist_monthly_base_pay" numeric(10, 2) DEFAULT '15000';--> statement-breakpoint
ALTER TABLE "clinic_settings" ADD COLUMN "receptionist_daily_work_hours" numeric(4, 1) DEFAULT '8';--> statement-breakpoint
ALTER TABLE "clinic_settings" ADD COLUMN "receptionist_overtime_rate" numeric(4, 1) DEFAULT '1.5';--> statement-breakpoint
ALTER TABLE "clinic_settings" ADD COLUMN "receptionist_weekly_bonus" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "rc_hours_worked" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "rc_daily_earning" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "rc_overtime_hours" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "rc_overtime_pay" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "rc_regular_earning" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "rc_overtime_earning" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "rc_weekly_bonuses_total" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "rc_total_final_salary" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "rc_total_days_worked" numeric(4, 0) DEFAULT '0';