import { timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { cockroachTable } from './cockroachTable';

export const referralRelationships = cockroachTable('referral_relationships', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralRelationship = typeof referralRelationships.$inferSelect;
export type NewReferralRelationship = typeof referralRelationships.$inferInsert;
