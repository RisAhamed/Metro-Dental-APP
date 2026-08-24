import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isSuperAdmin } from '@/lib/auth/claims';
import { SeedDataButton } from '@/components/admin/SeedDataButton';

export default async function SettingsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  if (!isSuperAdmin(sessionClaims)) redirect('/');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Extensible Lists */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Extensible Lists</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage the lookup values used across the app.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/admin/settings/sunday-tasks"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Sunday Tasks</p>
            <p className="text-xs text-gray-500 mt-1">
              Tasks assistants complete on Sundays for incentives.
            </p>
          </Link>
          <Link
            href="/admin/settings/surgery-types"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Surgery Types</p>
            <p className="text-xs text-gray-500 mt-1">
              Surgeries performed by the Chief Doctor, with referral incentives.
            </p>
          </Link>
          <Link
            href="/admin/settings/referral-sources"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Referral Sources</p>
            <p className="text-xs text-gray-500 mt-1">
              Where patients come from — Google, another patient, etc.
            </p>
          </Link>
          <Link
            href="/admin/settings/medical-conditions"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Medical Conditions</p>
            <p className="text-xs text-gray-500 mt-1">
              Chronic conditions tracked on patient profiles.
            </p>
          </Link>
          <Link
            href="/admin/settings/appointment-categories"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Appointment Categories</p>
            <p className="text-xs text-gray-500 mt-1">
              Labels used on appointments — check-up, surgery, etc.
            </p>
          </Link>
          <Link
            href="/admin/settings/patient-groups"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Patient Groups</p>
            <p className="text-xs text-gray-500 mt-1">
              Curated groups used to tag patients.
            </p>
          </Link>
          <Link
            href="/admin/settings/procedures"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Procedures Catalog</p>
            <p className="text-xs text-gray-500 mt-1">
              Manage procedures and default costs for treatment plans.
            </p>
          </Link>
        </div>
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Payroll & Compensation</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure doctor pay, work hours, revenue targets, and bonuses.
        </p>
        <div className="mt-3">
          <Link
            href="/admin/settings/payroll"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Payroll & Compensation Settings
          </Link>
        </div>
      </div>

      <SeedDataButton />
    </div>
  );
}
