'use client';

import { useState } from 'react';
import { Pencil, Printer, Trash2 } from 'lucide-react';
import type { PrescriptionEntry } from '@/components/patients/PatientPrescriptions';

function medicinesOf(rx: PrescriptionEntry) {
  return rx.medicines?.length
    ? rx.medicines
    : rx.drugs.map((d) => ({
        drugName: d.drugName,
        strength: d.dosage,
        strengthUnit: '',
        duration: d.duration,
        durationUnit: '',
        morning: '',
        noon: '',
        night: '',
        beforeAfterFood: '',
        instruction: d.instructions,
      }));
}

export function PrescriptionList({
  prescriptions,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onOpen,
}: {
  prescriptions: PrescriptionEntry[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (rx: PrescriptionEntry) => void;
  onDelete: (id: string) => void;
  onOpen: (rx: PrescriptionEntry) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {prescriptions.map((rx) => {
        const medicines = medicinesOf(rx);
        return (
          <div key={rx.prescriptionId} role="button" tabIndex={0} onClick={() => onOpen(rx)} onKeyDown={(e) => e.key === 'Enter' && onOpen(rx)} className="rounded-md border border-gray-100 p-4 transition-colors hover:border-blue-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  {rx.prescriptionId} • {new Date(rx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700">{rx.doctorName ? `Dr. ${rx.doctorName}` : '-'}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {medicines.slice(0, 4).map((m, i) => (
                    <li key={i} className="text-sm text-gray-800">
                      <span className="font-medium">{m.drugName}</span>
                      <span className="text-gray-500">
                        {' '}
                        {[m.strength && `${m.strength} ${m.strengthUnit || ''}`.trim(), m.duration && `${m.duration} ${m.durationUnit || ''}`.trim(), `${m.morning || '0'}-${m.noon || '0'}-${m.night || '0'}`, m.beforeAfterFood && `${m.beforeAfterFood.toLowerCase()} food`]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
                {rx.notes && <p className="mt-1 text-xs italic text-gray-400">{rx.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); window.open(`/prescriptions/${rx.prescriptionId}/print`, '_blank'); }} title="Print" className="rounded-md p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                  <Printer className="h-4 w-4" />
                </button>
                {canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit(rx); }} title="Edit" className="rounded-md p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(rx.prescriptionId); }} title="Delete" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Delete prescription?</h3>
            <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => { onDelete(deleteId); setDeleteId(null); }} className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
