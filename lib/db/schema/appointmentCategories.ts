import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const appointmentCategories = table('appointment_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  color: text('color').default('#6B7280'),
  clinicId: text('clinic_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AppointmentCategory = typeof appointmentCategories.$inferSelect;
export type NewAppointmentCategory = typeof appointmentCategories.$inferInsert;