'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FlaskConical,
  Package,
  Clock,
  Banknote,
  FileSpreadsheet,
  UserCog,
  Settings,
  ShoppingCart,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Role-based menus (hardcoded)
const ROLE_MENUS: Record<string, { label: string; href: string; icon: LucideIcon }[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'HR', href: '/hr/attendance', icon: Clock },
    { label: 'Payroll', href: '/admin/payroll', icon: Banknote },
    { label: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Users', href: '/admin/users', icon: UserCog },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  CLINIC_ADMIN: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'HR', href: '/hr/attendance', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  GENERAL_DOCTOR: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  ASSISTANT_DOCTOR: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  RECEPTIONIST: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Attendance', href: '/hr/attendance', icon: Clock },
  ],
  LAB_TECHNICIAN: [
    { label: 'Lab Orders', href: '/portal/lab/orders', icon: ClipboardList },
  ],
  VENDOR: [
    { label: 'Orders', href: '/portal/vendor/orders', icon: ShoppingCart },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || 'RECEPTIONIST';
  const menu = ROLE_MENUS[role] || [];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">Dental Clinic</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menu.map((item) => {
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
  );
}
