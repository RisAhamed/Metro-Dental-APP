import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const surgeryTypes = table('surgery_types', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SurgeryType = typeof surgeryTypes.$inferSelect;
export type NewSurgeryType = typeof surgeryTypes.$inferInsert;