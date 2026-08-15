import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isSuperAdmin } from '@/lib/auth/claims';
import { ListManager } from '@/components/admin/ListManager';

export default async function ReferralSourcesPage() {
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
      <h1 className="text-2xl font-bold">Referral Sources</h1>
      <ListManager
        title="Referral Sources"
        description="Where patients come from — Google, another patient, Dr. Iqbal, etc."
        apiPath="/api/referral-sources"
        recordsKey="sources"
      />
    </div>
  );
}
