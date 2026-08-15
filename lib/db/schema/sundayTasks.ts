import { cockroachTable as table } from './cockroachTable';
import { text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const sundayTasks = table('sunday_tasks', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('250'),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(), // Super Admin UID or 'system'
});

export type SundayTask = typeof sundayTasks.$inferSelect;
export type NewSundayTask = typeof sundayTasks.$inferInsert;