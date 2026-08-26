import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const labShades = table('lab_shades', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  hexColor: text('hex_color'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LabShade = typeof labShades.$inferSelect;
export type NewLabShade = typeof labShades.$inferInsert;
