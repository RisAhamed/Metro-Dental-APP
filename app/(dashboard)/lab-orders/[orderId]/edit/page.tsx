'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LabOrderForm } from '@/components/lab/LabOrderForm';

interface LabOrder {
  orderId: string;
  labId: string;
  labName: string;
  patientId: string;
  patientName: string;
  visitId: string | null;
  workDescription: string;
  overallDueDate: string | null;
  workType: string | null;
  workTypeId: string | null;
  shade: string | null;
  shadeId: string | null;
  totalAmount: string | null;
  stages: Array<{
    stageName: string;
    description: string;
    deadline: string | null;
    price: string | null;
    templateId: string | null;
  }>;
}

export default function EditLabOrderPage() {
  const { sessionClaims } = useAuth();
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/lab-orders/${params.orderId}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.order) setOrder(data.order);
          else setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading lab order:', error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.orderId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Lab order not found</p>
        <button onClick={() => router.push('/lab-orders')} className="mt-4 text-blue-600 hover:underline">
          Back to Lab Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push('/lab-orders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>
      <h1 className="text-2xl font-bold mb-6">Edit Lab Order — {order.orderId}</h1>
      <LabOrderForm
        mode="edit"
        clinicId={clinicId}
        initialData={{
          orderId: order.orderId,
          labId: order.labId,
          patientId: order.patientId,
          patientName: order.patientName,
          visitId: order.visitId,
          workDescription: order.workDescription,
          overallDueDate: order.overallDueDate,
          workType: order.workType,
          workTypeId: order.workTypeId,
          shade: order.shade,
          shadeId: order.shadeId,
          totalAmount: order.totalAmount,
          stages: order.stages.map((s) => ({
            stageName: s.stageName,
            description: s.description || '',
            deadline: s.deadline ? s.deadline.slice(0, 10) : '',
            price: s.price || '',
            templateId: s.templateId || null,
          })),
        }}
      />
    </div>
  );
}
