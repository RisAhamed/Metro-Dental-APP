import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isSuperAdmin } from '@/lib/auth/claims';
import { ListManager } from '@/components/admin/ListManager';

export default async function SurgeryTypesPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>
      <h1 className="text-2xl font-bold">Surgery Types</h1>
      <ListManager
        title="Surgery Types"
        description="Performed by the Chief Doctor (SUPER_ADMIN). Any doctor can refer a patient; when a surgery completes with revenue ≥ ₹20,000, the referring doctor gets a ₹1,500 incentive."
        apiPath="/api/surgery-types"
        recordsKey="records"
      />
    </div>
  );
}
