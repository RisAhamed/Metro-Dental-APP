'use client';

import { Pill, Printer } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';

export interface PrescriptionEntry {
  id: string;
  date: string;
  doctorName: string;
  drugName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  sourceVisitId?: string;
}

interface PatientPrescriptionsProps {
  prescriptions: PrescriptionEntry[];
  loading: boolean;
}

export function PatientPrescriptions({
  prescriptions,
  loading,
}: PatientPrescriptionsProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Pill className="h-5 w-5 text-blue-500" /> Prescriptions
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading prescriptions...</p>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          message="No prescriptions recorded yet. Prescription support is coming soon."
        />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-400">{formatDateDDMMM(rx.date)}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{rx.drugName}</p>
                  <p className="text-xs text-gray-500">
                    {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' • ') || '—'}
                  </p>
                  {rx.notes && <p className="text-xs text-gray-400 mt-1">{rx.notes}</p>}
                </div>
                <button
                  onClick={() => window.print()}
                  title="Print"
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                Dr. {rx.doctorName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
