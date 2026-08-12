import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth/claims';

export default async function ReportsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-gray-600">Coming soon in Phase 7</p>
    </div>
  );
}
