'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, sessionClaims } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) redirect('/sign-in');

  // Redirect lab techs and vendors to their portal (we'll implement later)
  const role = sessionClaims?.role as string;
  if (role === 'LAB_TECHNICIAN') redirect('/portal/lab/orders');
  if (role === 'VENDOR') redirect('/portal/vendor/orders');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 pt-16 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
