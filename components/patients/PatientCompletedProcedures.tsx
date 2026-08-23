'use client';

import { CheckCircle2 } from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

export interface CompletedProcedure {
  planId: string;
  planTitle: string | null;
  procedureId: string;
  procedureName: string;
  toothNumbers: number[] | null;
  isFullMouth: boolean;
  qty: number;
  unitCost: number;
  cost: number;
  discount: number;
  total: number;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface PatientCompletedProceduresProps {
  procedures: CompletedProcedure[];
  loading: boolean;
}

// Sort newest completion first (plans without a timestamp fall back to the end)
function sortKey(p: CompletedProcedure): number {
  return p.completedAt ? new Date(p.completedAt).getTime() : 0;
}

export function PatientCompletedProcedures({
  procedures,
  loading,
}: PatientCompletedProceduresProps) {
  const sorted = [...procedures].sort((a, b) => sortKey(b) - sortKey(a));

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" /> Completed Procedures
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Procedures marked as COMPLETED in treatment plans.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading procedures...</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          message="No completed procedures yet. Mark procedures as complete from a treatment plan."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((proc) => (
            <div
              key={`${proc.planId}-${proc.procedureId}`}
              className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-xs text-gray-400">
                  {proc.completedAt
                    ? formatDateDDMMM(proc.completedAt)
                    : 'Completion date not recorded'}
                </p>
                {proc.planTitle && (
                  <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">
                    {proc.planTitle}
                  </span>
                )}
              </div>

              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-gray-400 tracking-wide">
                    <th className="py-1 font-semibold">Procedure</th>
                    <th className="py-1 font-semibold text-right">Cost</th>
                    <th className="py-1 font-semibold text-right">Discount</th>
                    <th className="py-1 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-50">
                    <td className="py-1.5 font-medium text-gray-800">
                      {proc.procedureName}
                      {proc.qty > 1 && <span className="text-gray-400"> ×{proc.qty}</span>}
                      {proc.isFullMouth ? (
                        <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          FULL MOUTH
                        </span>
                      ) : proc.toothNumbers && proc.toothNumbers.length > 0 ? (
                        <span className="ml-2 text-blue-600 text-xs">
                          [{proc.toothNumbers.join('] [')}]
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">{formatMoney(proc.cost)}</td>
                    <td className="py-1.5 text-right text-gray-600">
                      {formatMoney(proc.discount)}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-green-700">
                      {formatMoney(proc.total)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {proc.notes && <p className="mt-2 text-xs text-gray-400 italic">{proc.notes}</p>}
              {proc.completedBy && (
                <p className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                  Completed by Dr. {proc.completedBy}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
