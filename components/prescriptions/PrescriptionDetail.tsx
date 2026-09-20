'use client';

import { Printer, X } from 'lucide-react';
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

export function PrescriptionDetail({
  prescription,
  patientId,
  patientName,
  onClose,
}: {
  prescription: PrescriptionEntry;
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const medicines = medicinesOf(prescription);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">{prescription.prescriptionId}</p>
            <h3 className="text-lg font-semibold text-gray-900">{patientName}</h3>
            <p className="text-sm text-gray-500">ID: {patientId}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.open(`/prescriptions/${prescription.prescriptionId}/print`, '_blank')} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 text-sm md:grid-cols-2">
          <p><span className="font-medium text-gray-700">Doctor:</span> {prescription.doctorName || '-'}</p>
          <p><span className="font-medium text-gray-700">Date:</span> {new Date(prescription.date).toLocaleDateString('en-IN')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="border p-2">#</th>
                <th className="border p-2">Medicine</th>
                <th className="border p-2">Strength</th>
                <th className="border p-2">Duration</th>
                <th className="border p-2">M</th>
                <th className="border p-2">N</th>
                <th className="border p-2">N</th>
                <th className="border p-2">Food</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m, i) => (
                <tr key={i}>
                  <td className="border p-2">{i + 1}</td>
                  <td className="border p-2 font-medium">{m.drugName}</td>
                  <td className="border p-2">{[m.strength, m.strengthUnit].filter(Boolean).join(' ') || '-'}</td>
                  <td className="border p-2">{[m.duration, m.durationUnit].filter(Boolean).join(' ') || '-'}</td>
                  <td className="border p-2">{m.morning || '0'}</td>
                  <td className="border p-2">{m.noon || '0'}</td>
                  <td className="border p-2">{m.night || '0'}</td>
                  <td className="border p-2">{m.beforeAfterFood || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {prescription.notes && <p className="mt-4 text-sm text-gray-700"><span className="font-medium">Notes:</span> {prescription.notes}</p>}
      </div>
    </div>
  );
}
