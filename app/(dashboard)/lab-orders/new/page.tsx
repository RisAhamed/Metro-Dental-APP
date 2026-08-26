'use client';

import { useAuth } from '@clerk/nextjs';
import { LabOrderForm } from '@/components/lab/LabOrderForm';

export default function NewLabOrderPage() {
  const { sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Lab Order</h1>
      <LabOrderForm mode="create" clinicId={clinicId} />
    </div>
  );
}