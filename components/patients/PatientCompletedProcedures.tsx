'use client';

import { CheckCircle2 } from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

export interface CompletedProcedure {
  visitId: string;
  visitDate: string;
  procedureName: string;
  toothNumber: string | null;
  region: string | null;
  notes: string | null;
  cost: number;
  discount: number;
  total: number;
  completedBy: string | null;
}

interface PatientCompletedProceduresProps {
  procedures: CompletedProcedure[];
  loading: boolean;
}

export function PatientCompletedProcedures({
  procedures,
  loading,
}: PatientCompletedProceduresProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" /> Completed Procedures
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading procedures...</p>
      ) : procedures.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          message="No completed procedures yet. Complete a visit session with dental chart entries."
        />
      ) : (
        <div className="space-y-4">
          {procedures.map((proc) => (
            <div
              key={proc.visitId + proc.procedureName + (proc.toothNumber || '')}
              className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
            >
              <p className="text-xs text-gray-400">{formatDateDDMMM(proc.visitDate)}</p>

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
                      {proc.toothNumber && (
                        <span className="ml-2 text-blue-600">[{proc.toothNumber}]</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">
                      {formatMoney(proc.cost)}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">
                      {formatMoney(proc.discount)}
                    </td>
                    <td className="py-1.5 text-right font-medium text-gray-800">
                      {formatMoney(proc.total)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {proc.notes && (
                <p className="mt-1 text-xs text-gray-400">{proc.notes}</p>
              )}
              {proc.completedBy && (
                <p className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                  Completed by {proc.completedBy}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
