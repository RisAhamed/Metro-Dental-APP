import { cockroachTable as table } from './cockroachTable';
import { text, boolean } from 'drizzle-orm/pg-core';

export const inventoryCategories = table('inventory_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  unit: text('unit').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type NewInventoryCategory = typeof inventoryCategories.$inferInsert;
