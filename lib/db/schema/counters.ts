import { cockroachTable as table } from './cockroachTable';
import { text, integer } from 'drizzle-orm/pg-core';

export const counters = table('counters', {
  key: text('key').primaryKey().notNull(),
  value: integer('value').default(0).notNull(),
});

export type Counter = typeof counters.$inferSelect;
export type NewCounter = typeof counters.$inferInsert;
