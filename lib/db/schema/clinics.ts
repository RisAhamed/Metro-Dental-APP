import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const clinics = table('clinics', {
  clinicId: text('clinic_id').primaryKey().notNull(), // 'clinic_a' or 'clinic_b'
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by'), // super admin uid
});

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
