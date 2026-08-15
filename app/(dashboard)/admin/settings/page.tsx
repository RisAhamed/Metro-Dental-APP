import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isSuperAdmin } from '@/lib/auth/claims';
import { SeedDataButton } from '@/components/admin/SeedDataButton';
import { SurgeryTypeManager } from '@/components/admin/SurgeryTypeManager';

export default async function SettingsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Sunday Tasks</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage the tasks assistants complete on Sundays for incentives.
        </p>
        <Link
          href="/admin/settings/sunday-tasks"
          className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Manage Sunday Tasks
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Inventory & Vendors</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage inventory items, vendors, and purchase orders.
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href="/inventory"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Inventory
          </Link>
          <Link
            href="/inventory/vendors"
            className="inline-block px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
          >
            Vendors
          </Link>
          <Link
            href="/inventory/purchase-orders"
            className="inline-block px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
          >
            Purchase Orders
          </Link>
        </div>
      </div>
      <SurgeryTypeManager />
      <SeedDataButton />
    </div>
  );
}