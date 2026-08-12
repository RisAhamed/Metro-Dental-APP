import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

// User roles enum
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'GENERAL_DOCTOR',
  'ASSISTANT_DOCTOR',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
  'VENDOR',
]);

export const users = table('users', {
  uid: text('uid').primaryKey().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  primaryClinicId: text('primary_clinic_id'), // can be null (for super admin)
  clinicIds: text('clinic_ids').array().notNull(), // list of clinics user belongs to
  isActive: boolean('is_active').default(true).notNull(),
  // Additional fields for lab/vendor
  labId: text('lab_id'),
  vendorId: text('vendor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(), // uid of creator
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
