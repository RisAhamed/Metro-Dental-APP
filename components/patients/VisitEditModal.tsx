'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AutoTextarea } from './shared';

export interface EditableVisit {
  visitId: string;
  visitDate: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  additionalNotes: string | null;
  injectionGiven?: boolean | null;
  vitalSigns: {
    age?: number | null;
    weight?: number | null;
    bloodPressure?: string | null;
    bloodSugar?: number | null;
    pulseRate?: number | null;
    spo2?: number | null;
  } | null;
}

interface VisitEditModalProps {
  visit: EditableVisit;
  onClose: () => void;
  onSaved: (updated: Record<string, unknown>) => void;
}

export function VisitEditModal({ visit, onClose, onSaved }: VisitEditModalProps) {
  const [tab, setTab] = useState<'VITALS' | 'NOTES'>('VITALS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [vitals, setVitals] = useState({
    age: visit.vitalSigns?.age?.toString() || '',
    weight: visit.vitalSigns?.weight?.toString() || '',
    bloodPressure: visit.vitalSigns?.bloodPressure || '',
    bloodSugar: visit.vitalSigns?.bloodSugar?.toString() || '',
    pulseRate: visit.vitalSigns?.pulseRate?.toString() || '',
    spo2: visit.vitalSigns?.spo2?.toString() || '',
  });

  const [notes, setNotes] = useState({
    chiefComplaint: visit.chiefComplaint || '',
    diagnosis: visit.diagnosis || '',
    treatmentGiven: visit.treatmentGiven || '',
    injectionGiven: !!visit.injectionGiven,
    additionalNotes: visit.additionalNotes || '',
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload =
        tab === 'VITALS'
          ? {
              vitalSigns: {
                age: vitals.age === '' ? null : Number(vitals.age),
                weight: vitals.weight === '' ? null : Number(vitals.weight),
                bloodPressure: vitals.bloodPressure.trim() || null,
                bloodSugar: vitals.bloodSugar === '' ? null : Number(vitals.bloodSugar),
                pulseRate: vitals.pulseRate === '' ? null : Number(vitals.pulseRate),
                spo2: vitals.spo2 === '' ? null : Number(vitals.spo2),
              },
            }
          : {
              chiefComplaint: notes.chiefComplaint.trim() || null,
              diagnosis: notes.diagnosis.trim() || null,
              treatmentGiven: notes.treatmentGiven.trim() || null,
              injectionGiven: notes.injectionGiven,
              additionalNotes: notes.additionalNotes.trim() || null,
            };

      const res = await fetch(`/api/visits/${visit.visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(data.visit);
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Edit Session</h2>
            <p className="text-xs text-gray-400">
              {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 pt-2">
          {(
            [
              ['VITALS', 'Vital Signs'],
              ['NOTES', 'Clinical Notes'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {tab === 'VITALS' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Age</label>
                <input type="number" min="0" className={inputCls} value={vitals.age}
                  onChange={(e) => setVitals({ ...vitals, age: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Weight (kg)</label>
                <input type="number" min="0" step="0.1" className={inputCls} value={vitals.weight}
                  onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Blood Pressure (mmHg)</label>
                <input className={inputCls} placeholder="120/80" value={vitals.bloodPressure}
                  onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Blood Sugar (mg/dL)</label>
                <input type="number" min="0" className={inputCls} value={vitals.bloodSugar}
                  onChange={(e) => setVitals({ ...vitals, bloodSugar: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Pulse Rate (bpm)</label>
                <input type="number" min="0" className={inputCls} value={vitals.pulseRate}
                  onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>SpO₂ (%)</label>
                <input type="number" min="0" max="100" className={inputCls} value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Chief Complaint</label>
                <AutoTextarea value={notes.chiefComplaint}
                  onChange={(v) => setNotes({ ...notes, chiefComplaint: v })}
                  minRows={3} placeholder="Patient's main concern..." />
              </div>
              <div>
                <label className={labelCls}>Diagnosis</label>
                <AutoTextarea value={notes.diagnosis}
                  onChange={(v) => setNotes({ ...notes, diagnosis: v })}
                  minRows={3} placeholder="Clinical diagnosis..." />
              </div>
              <div>
                <label className={labelCls}>Treatment Given</label>
                <AutoTextarea value={notes.treatmentGiven}
                  onChange={(v) => setNotes({ ...notes, treatmentGiven: v })}
                  minRows={3} placeholder="Treatment administered..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notes.injectionGiven}
                  onChange={(e) => setNotes({ ...notes, injectionGiven: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Injection given
              </label>
              <div>
                <label className={labelCls}>Additional Notes</label>
                <AutoTextarea value={notes.additionalNotes}
                  onChange={(v) => setNotes({ ...notes, additionalNotes: v })}
                  minRows={3} placeholder="Any other observations..." />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
