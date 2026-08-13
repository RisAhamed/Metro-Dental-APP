import { cockroachTable as table } from './cockroachTable';
import { text, timestamp } from 'drizzle-orm/pg-core';

// Deterministic slot key: {doctorId}_{date}_{time}
// Example: doctor_abc123_20250811_1800
export const appointmentSlots = table('appointment_slots', {
  slotKey: text('slot_key').primaryKey().notNull(),
  doctorId: text('doctor_id').notNull(),
  appointmentId: text('appointment_id').notNull(),
  bookedAt: timestamp('booked_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AppointmentSlot = typeof appointmentSlots.$inferSelect;
export type NewAppointmentSlot = typeof appointmentSlots.$inferInsert;