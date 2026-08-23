'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, CheckCircle2 } from 'lucide-react';

interface PlanProcedure {
  procedureId: string;
  procedureName: string;
  qty: number;
  unitCost: number;
  discount: number;
  total: number;
  toothNumbers: number[] | null;
  isFullMouth: boolean;
  isMultiplyCost: boolean;
  notes: string | null;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: string | null;
  completedByName?: string | null;
}

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  procedures: PlanProcedure[];
  totalCost: string;
  totalDiscount: string;
  grandTotal: string;
  notes: string | null;
  createdAt: string;
}

const PROC_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

function ProcStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${map[status] || map.PENDING}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function TreatmentPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updatingIdx, setUpdatingIdx] = useState<number | null>(null);
  const [userName, setUserName] = useState('');

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId || '';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/treatment-plans/${planId}`);
        const data = await res.json();
        if (res.ok) setPlan(data.plan);
        else setNotFound(true);
      } catch (error) {
        console.error('Error loading treatment plan:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (planId) load();
  }, [planId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (res.ok && data.user?.name) setUserName(data.user.name);
      } catch {
        // Status will be recorded without a name
      }
    };
    load();
  }, []);

  const updateProcedureStatus = async (idx: number, status: (typeof PROC_STATUSES)[number]) => {
    if (!plan) return;
    setUpdatingIdx(idx);
    try {
      const procedures = plan.procedures.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          status,
          completedAt:
            status === 'COMPLETED'
              ? new Date().toISOString()
              : null,
          completedByName:
            status === 'COMPLETED'
              ? userName || undefined
              : null,
        };
      });

      const res = await fetch(`/api/treatment-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedures }),
      });
      const data = await res.json();
      if (res.ok) setPlan(data.plan);
      else alert(data.error || 'Failed to update procedure status');
    } catch {
      alert('An error occurred while updating the procedure');
    } finally {
      setUpdatingIdx(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (notFound || !plan) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Treatment plan not found</p>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  const statusColor =
    plan.status === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : plan.status === 'COMPLETED'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-yellow-100 text-yellow-700';

  const completedCount = plan.procedures.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.title || 'Untitled Plan'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{plan.planId}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor}`}>{plan.status}</span>
              <span className="text-sm text-gray-500">
                Created {new Date(plan.createdAt).toLocaleDateString()}
              </span>
              {plan.procedures.length > 0 && (
                <span className="text-sm text-gray-500">
                  • {completedCount}/{plan.procedures.length} completed
                </span>
              )}
            </div>
          </div>
          {(plan.status === 'DRAFT' || plan.status === 'ACTIVE') && (
            <button
              onClick={() => router.push(`/patients/${patientId}/treatment-plans/${planId}/edit`)}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" /> Edit Plan
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Procedures</h2>
          <p className="text-xs text-gray-400">
            Mark each procedure as In Progress or Completed as treatment advances. Completed
            procedures appear in the patient&apos;s Completed Procedures section.
          </p>
        </div>
        {plan.procedures.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-500">No procedures in this plan.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QTY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teeth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plan.procedures.map((proc, idx) => (
                <tr key={`${proc.procedureId}-${idx}`} className={proc.status === 'COMPLETED' ? 'bg-green-50/40' : ''}>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {proc.status === 'COMPLETED' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {proc.procedureName}
                    </p>
                    {proc.notes && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap max-w-md">{proc.notes}</p>}
                    {proc.status === 'COMPLETED' && proc.completedAt && (
                      <p className="text-[11px] text-green-700 mt-0.5">
                        Completed{proc.completedByName ? ` by Dr. ${proc.completedByName}` : ''} on{' '}
                        {new Date(proc.completedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{proc.qty}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">₹{proc.unitCost.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-sm text-red-600">₹{proc.discount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                    ₹{proc.total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3">
                    {proc.isFullMouth ? (
                      <span className="text-xs text-gray-500">Full Mouth</span>
                    ) : proc.toothNumbers && proc.toothNumbers.length > 0 ? (
                      <span className="text-xs text-gray-500">
                        {proc.toothNumbers.map((t) => `[${t}]`).join(' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <ProcStatusChip status={proc.status || 'PENDING'} />
                      {PROC_STATUSES.map((s) => {
                        const current = proc.status || 'PENDING';
                        if (s === current) return null;
                        // Only forward transitions: PENDING → IN_PROGRESS → COMPLETED
                        const order = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 } as const;
                        if (order[s] < order[current as keyof typeof order]) return null;
                        return (
                          <button
                            key={s}
                            disabled={updatingIdx === idx}
                            onClick={() => updateProcedureStatus(idx, s)}
                            title={`Mark as ${s.replace('_', ' ')}`}
                            className={`px-2 py-1 text-[10px] rounded border transition-colors disabled:opacity-50 ${
                              s === 'COMPLETED'
                                ? 'border-green-300 text-green-700 hover:bg-green-50'
                                : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            }`}
                          >
                            {s === 'COMPLETED' ? 'Complete' : s === 'IN_PROGRESS' ? 'Start' : s}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{Number(plan.totalCost || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Discount</p>
            <p className="text-xl font-bold text-red-600">
              ₹{Number(plan.totalDiscount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-xs text-blue-500">Grand Total</p>
            <p className="text-xl font-bold text-blue-700">
              ₹{Number(plan.grandTotal || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {plan.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
