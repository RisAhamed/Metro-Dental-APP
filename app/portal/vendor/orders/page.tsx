import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function VendorOrdersPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (sessionClaims?.role !== 'VENDOR') redirect('/');

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <p className="text-gray-600">Coming soon in Phase 4</p>
    </div>
  );
}
