import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isStaff } from '@/lib/auth/claims';

export default async function CalendarPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isStaff(sessionClaims)) redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="text-gray-600">Coming soon in Phase 3</p>
    </div>
  );
}
