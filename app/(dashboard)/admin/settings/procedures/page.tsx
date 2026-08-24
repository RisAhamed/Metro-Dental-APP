import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { ProceduresCatalogAdmin } from '@/components/admin/ProceduresCatalogAdmin';

export default async function ProceduresSettingsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims) && !isClinicAdmin(sessionClaims)) redirect('/');

  return <ProceduresCatalogAdmin />;
}
