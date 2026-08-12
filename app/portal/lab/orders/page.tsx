import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LabOrdersPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (sessionClaims?.role !== 'LAB_TECHNICIAN') redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold">Lab Orders</h1>
      <p className="text-gray-600">Coming soon in Phase 5</p>
    </div>
  );
}
