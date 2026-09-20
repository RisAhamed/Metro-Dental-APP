'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { DrugSidebar } from './DrugSidebar';
import { useAutoResize } from '@/hooks/useAutoResize';
import type { PrescriptionMedicine } from '@/lib/db/schema/prescriptions';

interface DrugSuggestion {
  id: string;
  name: string;
  defaultStrength: string | null;
  defaultStrengthUnit: string | null;
  defaultDuration: string | null;
  defaultDurationUnit: string | null;
  defaultFrequency: string | null;
}

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
  medicines?: PrescriptionMedicine[];
  drugs?: PrescriptionDrug[];
  notes: string | null;
}

interface PrescriptionFormProps {
  patientId: string;
  clinicId: string;
  patientName: string;
  initial?: EditablePrescription | null;
  onCancel: () => void;
  onSaved: (rx: Record<string, unknown>) => void;
  canManageTemplates?: boolean;
  userRole?: string;
  userId?: string;
}

const units = ['mg', 'ml', 'g', 'mcg'];
const durationUnits = ['day', 'week', 'month'];
const foodOptions = ['Before', 'After'];
const inputCls = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function emptyMedicine(): PrescriptionMedicine {
  return {
    drugName: '',
    strength: '',
    strengthUnit: 'mg',
    duration: '',
    durationUnit: 'day',
    morning: '0',
    noon: '0',
    night: '0',
    beforeAfterFood: null,
    instruction: null,
  };
}

function legacyToMedicine(drug: PrescriptionDrug): PrescriptionMedicine {
  const dosage = drug.dosage?.match(/^(\S+)\s*(.*)$/);
  const frequency = drug.frequency?.match(/^(\d+)-(\d+)-(\d+)$/);
  const duration = drug.duration?.match(/^(\S+)\s*(.*)$/);
  return {
    drugName: drug.drugName,
    strength: dosage?.[1] || drug.dosage || '',
    strengthUnit: dosage?.[2] || 'mg',
    duration: duration?.[1] || drug.duration || '',
    durationUnit: duration?.[2] || 'day',
    morning: frequency?.[1] || '0',
    noon: frequency?.[2] || '0',
    night: frequency?.[3] || '0',
    beforeAfterFood: null,
    instruction: drug.instructions || null,
  };
}

function frequencyDefaults(value: string | null) {
  const v = (value || '').toUpperCase();
  if (v === 'TDS') return { morning: '1', noon: '1', night: '1' };
  if (v === 'BD') return { morning: '1', noon: '0', night: '1' };
  if (v === 'OD') return { morning: '1', noon: '0', night: '0' };
  return {};
}

export function PrescriptionForm({
  patientId,
  clinicId,
  patientName,
  initial,
  onCancel,
  onSaved,
  canManageTemplates = true,
  userRole,
  userId,
}: PrescriptionFormProps) {
  const isEdit = Boolean(initial?.prescriptionId);
  const [date, setDate] = useState(() => initial?.date || new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState(() => initial?.doctorName || '');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>(() => {
    if (initial?.medicines?.length) return initial.medicines;
    if (initial?.drugs?.length) return initial.drugs.map(legacyToMedicine);
    return [emptyMedicine()];
  });
  const [notes, setNotes] = useState(() => initial?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const updateMedicine = (idx: number, patch: Partial<PrescriptionMedicine>) =>
    setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const addDrug = (drug: DrugSuggestion) => {
    setMedicines((prev) => [
      ...prev,
      {
        ...emptyMedicine(),
        drugName: drug.name,
        strength: drug.defaultStrength || '',
        strengthUnit: drug.defaultStrengthUnit || 'mg',
        duration: drug.defaultDuration || '',
        durationUnit: drug.defaultDurationUnit || 'day',
        ...frequencyDefaults(drug.defaultFrequency),
      },
    ]);
  };

  const savePrescription = async () => {
    if (medicines.some((m) => !m.drugName.trim())) {
      setError('Every row needs a drug name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        date,
        doctorName: doctorName.trim() || null,
        medicines,
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

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    const res = await fetch('/api/prescription-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: templateDescription.trim() || null,
        clinicId,
        medicines,
        notes: notes.trim() || null,
      }),
    });
    if (res.ok) {
      setTemplateOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <DrugSidebar
        clinicId={clinicId}
        currentMedicines={medicines}
        currentNotes={notes}
        canManageTemplates={canManageTemplates}
        userRole={userRole}
        userId={userId}
        onAddDrug={addDrug}
        onLoadTemplate={(template) => {
          setMedicines(template.medicines.length ? template.medicines : [emptyMedicine()]);
          setNotes(template.notes || '');
        }}
      />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <div className="grid gap-3 border-b border-gray-200 p-3 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Doctor
            <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[2fr_1.1fr_1.1fr_.65fr_.65fr_.65fr_1.2fr_40px] gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
              <span>DRUG NAME</span>
              <span>STRENGTH</span>
              <span>DURATION</span>
              <span>MORNING</span>
              <span>NOON</span>
              <span>NIGHT</span>
              <span>FOOD</span>
              <span />
            </div>
            {medicines.map((medicine, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1.1fr_1.1fr_.65fr_.65fr_.65fr_1.2fr_40px] gap-2 border-b border-gray-100 px-3 py-3">
                <div>
                  <DrugNameInput
                    clinicId={clinicId}
                    value={medicine.drugName}
                    onChange={(drugName) => updateMedicine(idx, { drugName })}
                    onSelect={(drug) => updateMedicine(idx, {
                      drugName: drug.name,
                      strength: drug.defaultStrength || medicine.strength,
                      strengthUnit: drug.defaultStrengthUnit || medicine.strengthUnit || 'mg',
                      duration: drug.defaultDuration || medicine.duration,
                      durationUnit: drug.defaultDurationUnit || medicine.durationUnit || 'day',
                      ...frequencyDefaults(drug.defaultFrequency),
                    })}
                  />
                  {medicine.instruction === null ? (
                    <button onClick={() => updateMedicine(idx, { instruction: '' })} className="mt-2 text-xs text-blue-600 hover:underline">
                      + add instruction
                    </button>
                  ) : (
                    <AutoTextarea value={medicine.instruction || ''} onChange={(instruction) => updateMedicine(idx, { instruction })} placeholder="Instruction" />
                  )}
                </div>
                <NumberWithUnit value={medicine.strength || ''} unit={medicine.strengthUnit || 'mg'} units={units} onValue={(strength) => updateMedicine(idx, { strength })} onUnit={(strengthUnit) => updateMedicine(idx, { strengthUnit })} />
                <NumberWithUnit value={medicine.duration || ''} unit={medicine.durationUnit || 'day'} units={durationUnits} onValue={(duration) => updateMedicine(idx, { duration })} onUnit={(durationUnit) => updateMedicine(idx, { durationUnit })} />
                <input type="number" min="0" value={medicine.morning || '0'} onChange={(e) => updateMedicine(idx, { morning: e.target.value })} className={inputCls} />
                <input type="number" min="0" value={medicine.noon || '0'} onChange={(e) => updateMedicine(idx, { noon: e.target.value })} className={inputCls} />
                <input type="number" min="0" value={medicine.night || '0'} onChange={(e) => updateMedicine(idx, { night: e.target.value })} className={inputCls} />
                <div className="flex gap-2 text-sm">
                  {foodOptions.map((option) => (
                    <label key={option} className="flex items-center gap-1">
                      <input type="radio" checked={medicine.beforeAfterFood === option} onChange={() => updateMedicine(idx, { beforeAfterFood: option })} />
                      {option}
                    </label>
                  ))}
                </div>
                <button onClick={() => setMedicines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-100 p-3">
          <button onClick={() => setMedicines((prev) => [...prev, emptyMedicine()])} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <Plus className="h-4 w-4" /> Add Drug Row
          </button>
        </div>

        <div className="border-b border-gray-100 p-3">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <AutoTextarea value={notes} onChange={setNotes} placeholder="General instructions" />
        </div>

        {error && <p className="px-3 pt-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 p-3">
          <button onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => setTemplateOpen(true)} disabled={!canManageTemplates} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40">
            <Save className="h-4 w-4" /> Save as Template
          </button>
          <button onClick={savePrescription} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      </div>

      {templateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Save Template</h3>
              <button onClick={() => setTemplateOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" className={inputCls} />
            <textarea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Description" className={`${inputCls} mt-2 min-h-20`} />
            <button onClick={saveTemplate} className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberWithUnit({
  value,
  unit,
  units,
  onValue,
  onUnit,
}: {
  value: string;
  unit: string;
  units: string[];
  onValue: (value: string) => void;
  onUnit: (unit: string) => void;
}) {
  return (
    <div className="flex">
      <input type="number" min="0" value={value} onChange={(e) => onValue(e.target.value)} className={`${inputCls} rounded-r-none`} />
      <select value={unit} onChange={(e) => onUnit(e.target.value)} className="rounded-r-md border border-l-0 border-gray-300 bg-white px-1 text-sm">
        {units.map((u) => <option key={u}>{u}</option>)}
      </select>
    </div>
  );
}

function AutoTextarea({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useAutoResize(ref, value);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`${inputCls} mt-2 min-h-9 resize-none overflow-hidden`}
    />
  );
}

function DrugNameInput({
  clinicId,
  value,
  onChange,
  onSelect,
}: {
  clinicId: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (drug: DrugSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const showSuggestions = focused && value.trim().length >= 2;

  useEffect(() => {
    if (!showSuggestions) return;
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/drugs?clinicId=${encodeURIComponent(clinicId)}&search=${encodeURIComponent(value)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.drugs || []);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [clinicId, showSuggestions, value]);

  return (
    <div className="relative">
      <input value={value} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {suggestions.map((drug) => (
            <button key={drug.id} onMouseDown={() => onSelect(drug)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50">
              {drug.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
