'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader } from 'lucide-react';

interface Stage {
  stageId: string;
  stageName: string;
  description: string;
  deadline: string | null;
  status: string;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
}

interface LabOrder {
  orderId: string;
  labId: string;
  labName: string;
  patientId: string;
  patientName: string;
  visitId: string | null;
  orderedByDoctorName: string;
  orderDate: string;
  overallDueDate: string | null;
  workDescription: string;
  stages: Stage[];
  status: string;
}

interface StageCost {
  stageId: string;
  stageName: string;
  cost: string | number | null;
}

interface LabBilling {
  totalCost: string | number | null;
  amountPaid: string | number | null;
  paymentStatus: string;
  stageCosts: StageCost[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-500';
}

export default function LabOrderDetailPage() {
  const { sessionClaims } = useAuth();
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [billing, setBilling] = useState<LabBilling | null>(null);
  const [loading, setLoading] = useState(true);

  const role = (sessionClaims?.role as string) || '';
  const isDoctor = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR'].includes(role);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/lab-orders/${params.orderId}`);
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch (error) {
        console.error('Error fetching lab order:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.orderId]);

  useEffect(() => {
    if (!isDoctor || !params.orderId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/lab-orders/${params.orderId}/billing`);
        const data = await res.json();
        if (!cancelled) setBilling(data.billing);
      } catch (error) {
        console.error('Error fetching billing:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.orderId, isDoctor]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Lab order not found</p>
        <button
          onClick={() => router.push('/lab-orders')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Lab Orders
        </button>
      </div>
    );
  }

  const completedStages = order.stages.filter((s) => s.status === 'COMPLETED').length;
  const totalStages = order.stages.length;

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push('/lab-orders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{order.orderId}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Created {new Date(order.orderDate).toLocaleString()}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs rounded-full text-white ${statusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Patient</dt>
            <dd className="font-medium">{order.patientName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Lab</dt>
            <dd className="font-medium">{order.labName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Ordering Doctor</dt>
            <dd className="font-medium">{order.orderedByDoctorName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Due Date</dt>
            <dd className="font-medium">
              {order.overallDueDate ? new Date(order.overallDueDate).toLocaleDateString() : 'Not set'}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500">Work Description</h3>
          <p className="mt-1">{order.workDescription}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Stages ({completedStages}/{totalStages})</h2>
        </div>
        <div className="space-y-3">
          {order.stages.map((stage) => (
            <div key={stage.stageId} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {stage.status === 'COMPLETED' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Loader className="h-5 w-5 text-gray-300" />
                  )}
                  <div>
                    <p className="font-medium">{stage.stageName}</p>
                    {stage.deadline && (
                      <p className="text-xs text-gray-500">Deadline: {stage.deadline}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full text-white ${
                    statusColor(stage.status)
                  }`}
                >
                  {stage.status}
                </span>
              </div>
              {stage.description && (
                <p className="mt-2 text-sm text-gray-600">{stage.description}</p>
              )}
              {stage.completedByName && (
                <p className="mt-2 text-xs text-gray-500">
                  Completed by {stage.completedByName} on{' '}
                  {stage.completedAt ? new Date(stage.completedAt).toLocaleString() : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {billing && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Lab Billing</h2>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Total Cost</dt>
              <dd className="font-semibold">₹{Number(billing.totalCost || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Amount Paid</dt>
              <dd className="font-semibold text-green-600">₹{Number(billing.amountPaid || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Payment Status</dt>
              <dd className="font-semibold">{billing.paymentStatus}</dd>
            </div>
          </dl>
          {(billing.stageCosts || []).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Stage Costs</h3>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2">Stage</th>
                    <th className="py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.stageCosts.map((c: StageCost) => (
                    <tr key={c.stageId} className="border-b border-gray-100">
                      <td className="py-2">{c.stageName}</td>
                      <td className="py-2">₹{Number(c.cost || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}