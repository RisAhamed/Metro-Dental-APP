import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const activityLogs = table('activity_logs', {
  logId: text('log_id').primaryKey().notNull(),
  clinicId: text('clinic_id').notNull(),
  dateString: text('date_string').notNull(), // "2025-08-13"
  type: text('type').notNull(), // 'PATIENT_CHECKIN', 'PAYMENT_RECORDED', 'LAB_ORDER_SENT', 'PURCHASE_ORDER_PLACED', etc.
  message: text('message').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role'),
  relatedEntityType: text('related_entity_type'), // 'patient', 'appointment', 'lab_order', 'purchase_order', 'payment'
  relatedEntityId: text('related_entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
