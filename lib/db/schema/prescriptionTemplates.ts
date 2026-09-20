import { cockroachTable as table } from './cockroachTable';
import { boolean, jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import type { PrescriptionMedicine } from './prescriptions';

export const prescriptionTemplates = table('prescription_templates', {
  templateId: text('template_id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  clinicId: text('clinic_id').notNull(),
  createdBy: text('created_by').notNull(),
  createdByName: text('created_by_name').notNull(),
  medicines: jsonb('medicines').$type<PrescriptionMedicine[]>().notNull(),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type NewPrescriptionTemplate = typeof prescriptionTemplates.$inferInsert;
