'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, AlertTriangle } from 'lucide-react';

interface LabOrder {
  orderId: string;
  clinicId: string;
  patientName: string;
  workDescription: string;
  status: string;
  stages: Array<{ status: string }>;
  issues: Array<{ status: string }>;
  createdAt: string;
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

export default function LabPortalOrdersPage() {
  const { sessionClaims } = useAuth();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState(
    searchParams.get('clinicId') || 'both'
  );

  const role = (sessionClaims?.role as string) || '';
  const isLabTech = role === 'LAB_TECHNICIAN';

  useEffect(() => {
    if (!isLabTech) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (clinicId !== 'both') params.set('clinicId', clinicId);
        const res = await fetch(`/api/lab-orders?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching lab orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isLabTech, clinicId]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Lab Orders</h1>
        <div className="flex items-center gap-2">
          {(['both', 'clinic_a', 'clinic_b'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setClinicId(c)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                clinicId === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c === 'both' ? 'Both' : c === 'clinic_a' ? 'Clinic A' : 'Clinic B'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FlaskConical className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No lab orders assigned</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Work Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stages
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const completedStages = order.stages.filter(
                  (s) => s.status === 'COMPLETED'
                ).length;
                const totalStages = order.stages.length;
                const openIssues = (order.issues || []).filter(
                  (i) => i.status === 'OPEN'
                ).length;
                return (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/portal/lab/orders/${order.orderId}`}
                        className="text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        {order.orderId}
                        {openIssues > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700"
                            title={`${openIssues} open issue(s)`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {openIssues}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.clinicId === 'clinic_a' ? 'Clinic A' : 'Clinic B'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.workDescription.substring(0, 50)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full text-white ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {completedStages}/{totalStages}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
