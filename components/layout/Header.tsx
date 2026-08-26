'use client';

import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from './NotificationBell';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 sm:py-3 pl-14 sm:pl-16 md:pl-6 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">Dashboard</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <NotificationBell />
        <UserButton />
      </div>
    </header>
  );
}
