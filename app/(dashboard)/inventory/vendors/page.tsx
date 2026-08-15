'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import VendorsManager from '@/components/admin/VendorsManager';

export default function VendorsPage() {
  const { isLoaded, sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';

  if (!isLoaded) return null;
  if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role)) redirect('/');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vendors</h1>
      </div>
      <VendorsManager />
    </div>
  );
}
