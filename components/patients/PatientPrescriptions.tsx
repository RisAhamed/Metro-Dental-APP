'use client';

import { useState, useEffect } from 'react';
import { Pill, Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';
import { PrescriptionForm } from '@/components/prescriptions/PrescriptionForm';

export interface PrescriptionEntry {
  prescriptionId: string;
  date: string;
  doctorName: string | null;
  drugs: Array<{
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
  }>;
  notes: string | null;
}

interface PatientPrescriptionsProps {
  patientId: string;
  clinicId: string;
  patientName: string;
  canEdit: boolean;
}

export function PatientPrescriptions({
  patientId,
  clinicId,
  patientName,
  canEdit,
}: PatientPrescriptionsProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<PrescriptionEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/prescriptions`);
        const data = await res.json();
        if (!cancelled) setPrescriptions(data.prescriptions || []);
      } catch {
        // empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const upsert = (rx: Record<string, unknown>) => {
    setPrescriptions((prev) => {
      const exists = prev.some((p) => p.prescriptionId === rx.prescriptionId);
      return exists
        ? prev.map((p) => (p.prescriptionId === rx.prescriptionId ? (rx as unknown as PrescriptionEntry) : p))
        : [rx as unknown as PrescriptionEntry, ...prev];
    });
    setFormOpen(false);
    setEditingRx(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prescription?')) return;
    try {
      const res = await fetch(`/api/prescriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) setPrescriptions((prev) => prev.filter((p) => p.prescriptionId !== id));
      else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete prescription');
    }
  };

  const printRx = (rx: PrescriptionEntry) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const drugRows = rx.drugs
      .map(
        (d, i) => `<tr>
          <td>${i + 1}</td>
          <td><strong>${d.drugName}</strong></td>
          <td>${d.dosage || '—'}</td>
          <td>${d.frequency || '—'}</td>
          <td>${d.duration || '—'}</td>
          <td>${d.instructions || '—'}</td>
        </tr>`
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription ${rx.prescriptionId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 2px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
        .notes { margin-top: 16px; font-size: 13px; }
        .footer { margin-top: 48px; font-size: 13px; }
      </style></head><body>
      <h1>Prescription ${rx.prescriptionId}</h1>
      <div class="meta">
        Patient: <strong>${patientName}</strong> (${patientId})<br/>
        Date: ${formatDateDDMMM(rx.date)}<br/>
        Doctor: ${rx.doctorName ? `Dr. ${rx.doctorName}` : '—'}
      </div>
      <table>
        <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
        <tbody>${drugRows}</tbody>
      </table>
      ${rx.notes ? `<div class="notes"><strong>Notes:</strong> ${rx.notes}</div>` : ''}
      <div class="footer">_______________________<br/>Signature</div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const showForm =
    formOpen || (editingRx && canEdit);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Pill className="h-5 w-5 text-blue-500" /> Prescriptions
        </h3>
        {canEdit && !showForm && (
          <button
            onClick={() => {
              setEditingRx(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Prescription
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <PrescriptionForm
            patientId={patientId}
            clinicId={clinicId}
            patientName={patientName}
            initial={
              editingRx
                ? {
                    prescriptionId: editingRx.prescriptionId,
                    date: editingRx.date.slice(0, 10),
                    doctorName: editingRx.doctorName || '',
                    drugs: editingRx.drugs,
                    notes: editingRx.notes,
                  }
                : null
            }
            onCancel={() => {
              setFormOpen(false);
              setEditingRx(null);
            }}
            onSaved={upsert}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading prescriptions...</p>
      ) : prescriptions.length === 0 ? (
        <EmptyState icon={Pill} message="No prescriptions recorded yet." />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div
              key={rx.prescriptionId}
              className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">
                    {rx.prescriptionId} • {formatDateDDMMM(rx.date)}
                    {rx.doctorName ? ` • Dr. ${rx.doctorName}` : ''}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {rx.drugs.map((d, i) => (
                      <li key={i} className="text-sm text-gray-800">
                        <span className="font-medium">{d.drugName}</span>
                        <span className="text-gray-500">
                          {[d.dosage, d.frequency, d.duration].filter(Boolean).length > 0 &&
                            ` — ${[d.dosage, d.frequency, d.duration].filter(Boolean).join(', ')}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {rx.notes && <p className="text-xs text-gray-400 mt-1 italic">{rx.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => printRx(rx)}
                    title="Print"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => setEditingRx(rx)}
                        title="Edit"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rx.prescriptionId)}
                        title="Delete"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
