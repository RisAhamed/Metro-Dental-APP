'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { StatusBadge, EmptyState, formatMoney, formatDateDDMMM } from './shared';

export interface PatientPlan {
  planId: string;
  title: string | null;
  status: string;
  procedures: Array<{
    procedureName: string;
    qty: number;
    unitCost: number;
    discount: number;
    total: number;
  }> | null;
  totalCost: string;
  totalDiscount: string;
  grandTotal: string;
  createdAt: string;
  createdByName?: string | null;
}

interface PatientTreatmentPlansProps {
  plans: PatientPlan[];
  loading: boolean;
  patientId: string;
}

export function PatientTreatmentPlans({
  plans,
  loading,
  patientId,
}: PatientTreatmentPlansProps) {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-500" /> Treatment Plans
        </h3>
        <button
          onClick={() => router.push(`/patients/${patientId}/treatment-plans/new`)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Treatment Plan
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading treatment plans...</p>
      ) : plans.length === 0 ? (
        <EmptyState icon={ClipboardList} message="No treatment plans yet." />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const procedures = plan.procedures || [];
            return (
              <button
                key={plan.planId}
                onClick={() =>
                  router.push(`/patients/${patientId}/treatment-plans/${plan.planId}`)
                }
                className="w-full text-left border border-gray-100 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-400">{formatDateDDMMM(plan.createdAt)}</p>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="font-semibold text-gray-900 mt-1">
                  {plan.title || 'Treatment Plan'}
                </p>

                {procedures.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-gray-400 tracking-wide">
                        <th className="py-1 font-semibold">Procedure</th>
                        <th className="py-1 font-semibold text-right">Cost</th>
                        <th className="py-1 font-semibold text-right">Discount</th>
                        <th className="py-1 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procedures.map((p, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="py-1.5 text-gray-700">
                            {p.procedureName}
                            {p.qty > 1 && (
                              <span className="text-gray-400"> ×{p.qty}</span>
                            )}
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {formatMoney(p.unitCost * p.qty)}
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {formatMoney(p.discount)}
                          </td>
                          <td className="py-1.5 text-right font-medium text-gray-800">
                            {formatMoney(p.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-gray-500">
                    Planned by{plan.createdByName ? ` Dr. ${plan.createdByName}` : ''}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Estimated amount: </span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(plan.grandTotal)}
                    </span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
