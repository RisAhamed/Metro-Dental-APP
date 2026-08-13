import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const referralSources = table('referral_sources', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(), // "Google", "Another Patient", "Dr. Iqbal", etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralSource = typeof referralSources.$inferSelect;
export type NewReferralSource = typeof referralSources.$inferInsert;
