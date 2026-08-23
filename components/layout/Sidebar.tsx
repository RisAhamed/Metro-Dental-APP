'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/useMobile';
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
    { label: 'Attendance', href: '/hr/attendance', icon: Clock },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'Leaves', href: '/hr/leaves', icon: Clock },
    { label: 'Review Leaves', href: '/hr/leaves/review', icon: Clock },
    { label: 'Review Corrections', href: '/hr/corrections/review', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  GENERAL_DOCTOR: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'Leaves', href: '/hr/leaves', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  ASSISTANT_DOCTOR: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Lab Orders', href: '/lab-orders', icon: FlaskConical },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'Leaves', href: '/hr/leaves', icon: Clock },
    { label: 'My Payroll', href: '/hr/my-payroll', icon: Banknote },
  ],
  RECEPTIONIST: [
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Attendance', href: '/hr/attendance', icon: Clock },
    { label: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
    { label: 'Leaves', href: '/hr/leaves', icon: Clock },
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
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const nav = (
    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
      {menu.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (showCollapseToggle: boolean) => (
    <div
      className={cn(
        'p-4 border-b border-gray-200 flex items-center',
        showCollapseToggle && collapsed ? 'justify-center px-2' : 'justify-between'
      )}
    >
      <h1
        className={cn(
          'font-bold text-blue-600 whitespace-nowrap',
          showCollapseToggle && collapsed ? 'text-lg' : 'text-xl'
        )}
      >
        {showCollapseToggle && collapsed ? 'DC' : 'Dental Clinic'}
      </h1>
      {showCollapseToggle && (
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 bg-white rounded-md shadow-lg border border-gray-200"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
        )}
        <aside
          className={`fixed left-0 top-0 z-40 h-full w-64 bg-white shadow-lg transition-transform duration-300 flex flex-col ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="relative">
            {brand(false)}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-md"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {nav}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col h-screen transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {brand(true)}
      {nav}
    </aside>
  );
}
