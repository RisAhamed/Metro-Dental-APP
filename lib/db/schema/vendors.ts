import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const vendors = table('vendors', {
  vendorId: text('vendor_id').primaryKey().notNull(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  contactPerson: text('contact_person'),
  userId: text('user_id'),
  clinicId: text('clinic_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
