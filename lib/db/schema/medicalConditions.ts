import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const medicalConditions = table('medical_conditions', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(), // "Hypertension", "Diabetes", etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MedicalCondition = typeof medicalConditions.$inferSelect;
export type NewMedicalCondition = typeof medicalConditions.$inferInsert;
