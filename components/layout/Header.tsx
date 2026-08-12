'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-1 rounded-full hover:bg-gray-100">
          <Bell className="h-6 w-6 text-gray-600" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        <UserButton />
      </div>
    </header>
  );
}
