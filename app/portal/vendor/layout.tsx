'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { ShoppingCart } from 'lucide-react';

export default function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, sessionClaims } = useAuth();
  const role = sessionClaims?.role as string;

  if (!isLoaded) return null;
  if (role !== 'VENDOR') redirect('/');

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Dental Clinic</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link
            href="/portal/vendor/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-blue-50 text-blue-700"
          >
            <ShoppingCart className="h-5 w-5" />
            Orders
          </Link>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Vendor Portal</h2>
          <UserButton />
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
