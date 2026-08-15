import { cockroachTable as table } from './cockroachTable';
import { text, numeric, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const inventoryItems = table('inventory_items', {
  itemId: text('item_id').primaryKey().notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  quantityInStock: integer('quantity_in_stock').default(0).notNull(),
  reorderLevel: integer('reorder_level').default(10),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).default('0'),
  clinicId: text('clinic_id').notNull(),
  vendorId: text('vendor_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
