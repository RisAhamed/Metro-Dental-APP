'use client';

import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from './NotificationBell';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <UserButton />
      </div>
    </header>
  );
}
