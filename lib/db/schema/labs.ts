import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const labs = table('labs', {
  labId: text('lab_id').primaryKey().notNull(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  contactPerson: text('contact_person'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

export type Lab = typeof labs.$inferSelect;
export type NewLab = typeof labs.$inferInsert;