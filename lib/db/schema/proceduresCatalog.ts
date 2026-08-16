import { cockroachTable as table } from './cockroachTable';
import { text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const proceduresCatalog = table('procedures_catalog', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  defaultCost: numeric('default_cost', { precision: 10, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  clinicId: text('clinic_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Procedure = typeof proceduresCatalog.$inferSelect;
export type NewProcedure = typeof proceduresCatalog.$inferInsert;