import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth/claims';
import { SundayTasksAdmin } from '@/components/admin/SundayTasksAdmin';

export default async function SundayTasksSettingsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return <SundayTasksAdmin />;
}