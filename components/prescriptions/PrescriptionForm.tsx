'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

export interface PrescriptionDrug {
  drugName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface EditablePrescription {
  prescriptionId?: string;
  date: string;
  doctorName: string;
  drugs: PrescriptionDrug[];
  notes: string | null;
}

interface PrescriptionFormProps {
  patientId: string;
  clinicId: string;
  patientName: string;
  initial?: EditablePrescription | null;
  onCancel: () => void;
  onSaved: (rx: Record<string, unknown>) => void;
}

const emptyDrug = (): PrescriptionDrug => ({
  drugName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

export function PrescriptionForm({
  patientId,
  clinicId,
  patientName,
  initial,
  onCancel,
  onSaved,
}: PrescriptionFormProps) {
  const isEdit = Boolean(initial?.prescriptionId);
  const [date, setDate] = useState(
    () => initial?.date || new Date().toISOString().slice(0, 10)
  );
  const [doctorName, setDoctorName] = useState(() => initial?.doctorName || '');
  const [drugs, setDrugs] = useState<PrescriptionDrug[]>(
    () => (initial?.drugs?.length ? initial.drugs : [emptyDrug()])
  );
  const [notes, setNotes] = useState(() => initial?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateDrug = (idx: number, patch: Partial<PrescriptionDrug>) =>
    setDrugs((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const removeDrug = (idx: number) =>
    setDrugs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSave = async () => {
    if (drugs.some((d) => !d.drugName.trim())) {
      setError('Every drug row needs a drug name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        date,
        doctorName: doctorName.trim() || null,
        drugs: drugs.map((d) => ({ ...d })),
        notes: notes.trim() || null,
        patientName,
        clinicId,
      };
      const res = isEdit
        ? await fetch(`/api/prescriptions/${initial!.prescriptionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/patients/${patientId}/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (res.ok) onSaved(data.prescription);
      else setError(data.error || 'Failed to save prescription');
    } catch {
      setError('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">
          {isEdit ? 'Edit Prescription' : 'New Prescription'}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Doctor Name</label>
          <input
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. ..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Drug rows */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medicines</p>
        {drugs.map((drug, idx) => (
          <div key={idx} className="border border-gray-200 bg-white rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-5">{idx + 1}.</span>
              <input
                className={`${inputCls} flex-1`}
                placeholder="Drug name *"
                value={drug.drugName}
                onChange={(e) => updateDrug(idx, { drugName: e.target.value })}
              />
              <button
                onClick={() => removeDrug(idx)}
                disabled={drugs.length === 1}
                title="Remove"
                className="text-gray-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                className={inputCls}
                placeholder="Dosage (e.g. 500mg)"
                value={drug.dosage || ''}
                onChange={(e) => updateDrug(idx, { dosage: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Frequency (e.g. TDS)"
                value={drug.frequency || ''}
                onChange={(e) => updateDrug(idx, { frequency: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Duration (e.g. 5 days)"
                value={drug.duration || ''}
                onChange={(e) => updateDrug(idx, { duration: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Instructions"
                value={drug.instructions || ''}
                onChange={(e) => updateDrug(idx, { instructions: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => setDrugs((prev) => [...prev, emptyDrug()])}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Plus className="h-4 w-4" /> Add Another Medicine
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea
          rows={3}
          wrap="soft"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[72px]"
          placeholder="General instructions for the patient..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-white">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Prescription' : 'Save Prescription'}
        </button>
      </div>
    </div>
  );
}
