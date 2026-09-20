'use client';

import { useEffect, useState } from 'react';
import { Pill, Plus } from 'lucide-react';
import { EmptyState } from './shared';
import { PrescriptionForm } from '@/components/prescriptions/PrescriptionForm';
import { PrescriptionList } from '@/components/prescriptions/PrescriptionList';
import { PrescriptionDetail } from '@/components/prescriptions/PrescriptionDetail';
import type { PrescriptionMedicine } from '@/lib/db/schema/prescriptions';

export interface PrescriptionEntry {
  prescriptionId: string;
  date: string;
  doctorName: string | null;
  medicines: PrescriptionMedicine[];
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
  userRole?: string;
  userId?: string;
}

export function PatientPrescriptions({
  patientId,
  clinicId,
  patientName,
  canEdit,
  userRole,
  userId,
}: PatientPrescriptionsProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<PrescriptionEntry | null>(null);
  const [detailRx, setDetailRx] = useState<PrescriptionEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/prescriptions`);
        const data = await res.json();
        if (!cancelled) setPrescriptions(data.prescriptions || []);
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
    const res = await fetch(`/api/prescriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) setPrescriptions((prev) => prev.filter((p) => p.prescriptionId !== id));
  };

  const showForm = formOpen || (editingRx && canEdit);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-gray-700">
          <Pill className="h-5 w-5 text-blue-500" /> Prescriptions
        </h3>
        {canEdit && !showForm && (
          <button
            onClick={() => {
              setEditingRx(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
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
                    medicines: editingRx.medicines,
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
            canManageTemplates={canEdit}
            userRole={userRole}
            userId={userId}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading prescriptions...</p>
      ) : prescriptions.length === 0 ? (
        <EmptyState icon={Pill} message="No prescriptions recorded yet." />
      ) : (
        <PrescriptionList
          prescriptions={prescriptions}
          canEdit={canEdit}
          canDelete={userRole === 'SUPER_ADMIN'}
          onEdit={setEditingRx}
          onDelete={handleDelete}
          onOpen={setDetailRx}
        />
      )}

      {detailRx && (
        <PrescriptionDetail
          prescription={detailRx}
          patientId={patientId}
          patientName={patientName}
          onClose={() => setDetailRx(null)}
        />
      )}
    </div>
  );
}
