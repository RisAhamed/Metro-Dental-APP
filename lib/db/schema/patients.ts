import { cockroachTable as table } from './cockroachTable';
import {
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);

export const bloodGroupEnum = pgEnum('blood_group', [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
  'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'B1+',
]);

export const relationEnum = pgEnum('relation', [
  'CHILD', 'PARENT', 'BROTHER_SISTER', 'HUSBAND_WIFE',
  'GRANDCHILD', 'GRANDPARENT', 'UNCLE_AUNT', 'NEPHEW_NIECE', 'COUSIN',
]);

export const patients = table('patients', {
  patientId: text('patient_id').primaryKey().notNull(), // P-00001
  name: text('name').notNull(),
  gender: genderEnum('gender').notNull(),
  dateOfBirth: timestamp('date_of_birth', { withTimezone: true }),
  age: integer('age'),
  bloodGroup: bloodGroupEnum('blood_group'),
  primaryPhone: text('primary_phone').notNull(),
  secondaryPhone: text('secondary_phone'),
  email: text('email'),
  anniversary: timestamp('anniversary', { withTimezone: true }),
  address: jsonb('address').$type<{
    street: string;
    locality: string;
    city: string;
    pincode: string;
  }>(),
  referredById: text('referred_by_id'),
  referredByName: text('referred_by_name'),
  medicalHistory: text('medical_history').array().default([]), // array of condition names
  otherHistory: text('other_history'),
  groups: text('groups').array().default([]), // array of group ids
  familyMembers: jsonb('family_members').$type<
    Array<{
      patientId: string;
      relation: string;
      name: string;
    }>
  >().default([]),
  languagePreference: text('language_preference').default('English'),
  registeredClinicId: text('registered_clinic_id').notNull(),
  primaryDoctorId: text('primary_doctor_id'),
  primaryDoctorName: text('primary_doctor_name'),
  // Financial fields
  advanceBalance: numeric('advance_balance', { precision: 10, scale: 2 }).default('0'),
  totalDue: numeric('total_due', { precision: 10, scale: 2 }).default('0'),
  totalPaid: numeric('total_paid', { precision: 10, scale: 2 }).default('0'),
  // Metadata
  lastVisitDate: timestamp('last_visit_date', { withTimezone: true }),
  lastVisitClinicId: text('last_visit_clinic_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
