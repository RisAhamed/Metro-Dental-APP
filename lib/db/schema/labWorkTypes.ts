import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const labWorkTypes = table('lab_work_types', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LabWorkType = typeof labWorkTypes.$inferSelect;
export type NewLabWorkType = typeof labWorkTypes.$inferInsert;
