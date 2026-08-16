import { auth } from '@clerk/nextjs/server';

// Extend Clerk session claims with our custom fields
export interface SessionClaims {
  role: string;
  clinicIds: string[];
  primaryClinicId: string | null;
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const { sessionClaims } = await auth();
  return sessionClaims as SessionClaims | null;
}

function normalize(claims: unknown): SessionClaims | null {
  if (!claims || typeof claims !== 'object') return null;
  return claims as SessionClaims | null;
}

export function getUserRole(claims: unknown): string {
  return normalize(claims)?.role ?? 'unknown';
}

export function isSuperAdmin(claims: unknown): boolean {
  return normalize(claims)?.role === 'SUPER_ADMIN';
}

export function isClinicAdmin(claims: unknown): boolean {
  return normalize(claims)?.role === 'CLINIC_ADMIN';
}

// Can manage inventory, vendors, and purchase orders
export function canManageInventory(claims: unknown): boolean {
  return ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(normalize(claims)?.role || '');
}

// The clinic a non-super-admin belongs to (super admins span all clinics)
export function getPrimaryClinicId(claims: unknown): string | null {
  return normalize(claims)?.primaryClinicId ?? null;
}

// Can view and consume inventory stock (doctors, assistants, receptionists)
export function canConsumeInventory(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

export function isDoctor(claims: unknown): boolean {
  return ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR'].includes(
    normalize(claims)?.role || ''
  );
}

export function isStaff(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

// Can view and create patients (receptionists included)
export function canManagePatients(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

// Can view and manage shared lookup lists (referrals, medical conditions, groups)
export function canManageLookups(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

// HR attendance eligible roles (excludes LAB_TECHNICIAN, VENDOR, SUPER_ADMIN)
export function isHREligible(claims: unknown): boolean {
  return [
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

// Can view visits & treatment plans (receptionists included, read-only)
export function canViewClinical(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
    'RECEPTIONIST',
  ].includes(normalize(claims)?.role || '');
}

// Can create/edit clinical details of visits & treatment plans
export function canManageClinical(claims: unknown): boolean {
  return [
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'GENERAL_DOCTOR',
    'ASSISTANT_DOCTOR',
  ].includes(normalize(claims)?.role || '');
}
