import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth/claims';

export default async function SettingsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-gray-600">Coming soon</p>
    </div>
  );
}
