'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { ClipboardList, LayoutDashboard, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/portal/lab', icon: LayoutDashboard },
  { label: 'Lab Orders', href: '/portal/lab/orders', icon: ClipboardList },
  { label: 'Finance', href: '/portal/lab/finance', icon: Banknote },
];

export default function LabPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, sessionClaims } = useAuth();
  const pathname = usePathname();
  const role = sessionClaims?.role as string;

  if (!isLoaded) return null;
  if (role !== 'LAB_TECHNICIAN') redirect('/');

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Dental Clinic</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Lab Portal</h2>
          <UserButton />
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
