import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const clinicalNoteLookups = table('clinical_note_lookups', {
  id: text('id').primaryKey().notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  clinicId: text('clinic_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ClinicalNoteLookup = typeof clinicalNoteLookups.$inferSelect;
export type NewClinicalNoteLookup = typeof clinicalNoteLookups.$inferInsert;
