import { timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { cockroachTable } from './cockroachTable';

export const referralSubtypes = cockroachTable('referral_subtypes', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralSubtype = typeof referralSubtypes.$inferSelect;
export type NewReferralSubtype = typeof referralSubtypes.$inferInsert;
