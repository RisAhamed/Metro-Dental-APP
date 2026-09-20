import { cockroachTable as table } from './cockroachTable';
import { boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const drugs = table('drugs', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  defaultStrength: text('default_strength'),
  defaultStrengthUnit: text('default_strength_unit'),
  defaultDuration: text('default_duration'),
  defaultDurationUnit: text('default_duration_unit'),
  defaultFrequency: text('default_frequency'),
  isActive: boolean('is_active').default(true).notNull(),
  clinicId: text('clinic_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Drug = typeof drugs.$inferSelect;
export type NewDrug = typeof drugs.$inferInsert;
