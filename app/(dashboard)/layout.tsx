'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarProvider } from '@/components/layout/SidebarContext';

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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6 pt-14 sm:pt-16 md:pt-6 overflow-x-hidden">
            <div className="max-w-full mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
