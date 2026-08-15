import { cockroachTable as table } from './cockroachTable';
import { text, integer, timestamp } from 'drizzle-orm/pg-core';

export const inventoryConsumptions = table('inventory_consumptions', {
  consumptionId: text('consumption_id').primaryKey().notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
  remainingAfter: integer('remaining_after').notNull(),
  takenBy: text('taken_by').notNull(),
  takenByName: text('taken_by_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type InventoryConsumption = typeof inventoryConsumptions.$inferSelect;
export type NewInventoryConsumption = typeof inventoryConsumptions.$inferInsert;
