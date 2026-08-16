'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Eye, Pencil } from 'lucide-react';

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  totalCost: string;
  grandTotal: string;
  createdAt: string;
}

export default function TreatmentPlansListPage() {
  const params = useParams();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
        const data = await res.json();
        if (res.ok) setPlans(data.plans || []);
      } catch (error) {
        console.error('Error loading treatment plans:', error);
      } finally {
        setLoading(false);
      }
    };
    if (patientId) load();
  }, [patientId]);

  const statusColor = (status: string) =>
    status === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : status === 'COMPLETED'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <button
            onClick={() => router.push(`/patients/${patientId}/treatment-plans/new`)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Treatment Plan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-gray-500">Loading treatment plans...</p>
        ) : plans.length === 0 ? (
          <p className="text-center py-10 text-gray-500">No treatment plans yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.planId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{plan.title || 'Untitled Plan'}</p>
                    <p className="text-xs text-gray-500">{plan.planId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    ₹{Number(plan.grandTotal || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/patients/${patientId}/treatment-plans/${plan.planId}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => router.push(`/patients/${patientId}/treatment-plans/${plan.planId}/edit`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}