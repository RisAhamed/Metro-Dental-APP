'use client';

import { useState, useEffect } from 'react';
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { AutoTextarea } from './shared';

export interface EditablePatient {
  patientId: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  age: number | null;
  bloodGroup: string | null;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  anniversary: string | null;
  address: { street: string; locality: string; city: string; pincode: string } | null;
  referredByName: string | null;
  medicalHistory: string[];
  otherHistory: string | null;
  groups: string[];
  languagePreference: string | null;
  pastDiseases?: string[] | null;
  allergies?: string[] | null;
  previousMedicineIntake?: string | null;
  baselineVitals?: {
    heightCm?: number | null;
    weightKg?: number | null;
    bloodPressure?: string | null;
    bloodSugar?: number | null;
    pulseRate?: number | null;
    spo2?: number | null;
  } | null;
  generalNotes?: string | null;
}

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'B1+'];
const COMMON_DISEASES = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid', 'Epilepsy', 'Tuberculosis', 'Hepatitis'];
const COMMON_ALLERGIES = ['Penicillin', 'Aspirin', 'Ibuprofen', 'Latex', 'Sulfa Drugs', 'Local Anesthetic', 'Dust', 'Pollen'];

function toDateInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

interface PatientProfileEditProps {
  patient: EditablePatient;
  clinicId: string;
  onClose: () => void;
  onSaved: (updated: Record<string, unknown>) => void;
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50/60 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

// Tag editor used for past diseases & allergies
function TagEditor({
  label,
  placeholder,
  suggestions,
  tags,
  input,
  setInput,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  suggestions: string[];
  tags: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: (value: string) => void;
  onRemove: (name: string) => void;
}) {
  const filtered = suggestions.filter(
    (s) =>
      input.trim().length > 0 &&
      s.toLowerCase().includes(input.trim().toLowerCase()) &&
      !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-full"
            >
              {t}
              <button onClick={() => onRemove(t)} className="hover:text-amber-900 font-bold">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {suggestions
          .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAdd(s)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                tags.includes(s)
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-amber-400'
              }`}
            >
              + {s}
            </button>
          ))}
      </div>
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd(input);
          }
        }}
      />
      {filtered.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-1">Suggestions: {filtered.join(', ')}</p>
      )}
    </div>
  );
}

export function PatientProfileEdit({
  patient,
  clinicId,
  onClose,
  onSaved,
}: PatientProfileEditProps) {
  const [form, setForm] = useState({
    name: patient.name,
    gender: patient.gender,
    dateOfBirth: toDateInput(patient.dateOfBirth),
    age: patient.age?.toString() || '',
    bloodGroup: patient.bloodGroup || '',
    primaryPhone: patient.primaryPhone,
    secondaryPhone: patient.secondaryPhone || '',
    email: patient.email || '',
    anniversary: toDateInput(patient.anniversary),
    languagePreference: patient.languagePreference || 'English',
    referredByName: patient.referredByName || '',
    street: patient.address?.street || '',
    locality: patient.address?.locality || '',
    city: patient.address?.city || '',
    pincode: patient.address?.pincode || '',
    otherHistory: patient.otherHistory || '',
    previousMedicineIntake: patient.previousMedicineIntake || '',
    heightCm: patient.baselineVitals?.heightCm?.toString() || '',
    weightKg: patient.baselineVitals?.weightKg?.toString() || '',
    bloodPressure: patient.baselineVitals?.bloodPressure || '',
    bloodSugar: patient.baselineVitals?.bloodSugar?.toString() || '',
    pulseRate: patient.baselineVitals?.pulseRate?.toString() || '',
    spo2: patient.baselineVitals?.spo2?.toString() || '',
    generalNotes: patient.generalNotes || '',
  });
  const [conditions, setConditions] = useState<string[]>(() => [...(patient.medicalHistory || [])]);
  const [diseases, setDiseases] = useState<string[]>(() => [...(patient.pastDiseases || [])]);
  const [allergies, setAllergies] = useState<string[]>(() => [...(patient.allergies || [])]);
  const [tagInput, setTagInput] = useState({ diseases: '', allergies: '' });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    BASIC: true,
    CONTACT: true,
    MEDICAL: true,
    VITALS: false,
    NOTES: false,
  });
  const [conditionInput, setConditionInput] = useState('');
  const [conditionSuggestions, setConditionSuggestions] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(patient.groups || [])
  );
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [condRes, groupRes] = await Promise.all([
          fetch('/api/medical-conditions'),
          fetch(`/api/patient-groups?clinicId=${clinicId}`),
        ]);
        const condData = await condRes.json();
        const groupData = await groupRes.json();
        if (!cancelled) {
          setConditionSuggestions((condData.conditions || []).map((c: { name: string }) => c.name));
          setAllGroups(groupData.groups || []);
        }
      } catch {
        // Non-blocking: manual entry still works
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addCondition = (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) return;
    if (!conditions.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
      setConditions((prev) => [...prev, cleaned]);
    }
    setConditionInput('');
  };

  const removeCondition = (name: string) =>
    setConditions((prev) => prev.filter((c) => c !== name));

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Generic tag helpers for diseases / allergies
  const addTag = (
    kind: 'diseases' | 'allergies',
    value: string,
    current: string[],
    setter: (v: string[]) => void
  ) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    if (!current.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
      setter([...current, cleaned]);
    }
    setTagInput((prev) => ({ ...prev, [kind]: '' }));
  };

  const removeTag = (list: string[], setter: (v: string[]) => void, name: string) =>
    setter(list.filter((c) => c !== name));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/patients/${patient.patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          age: form.age === '' ? null : Number(form.age),
          dateOfBirth: form.dateOfBirth || null,
          anniversary: form.anniversary || null,
          address: {
            street: form.street,
            locality: form.locality,
            city: form.city,
            pincode: form.pincode,
          },
          medicalHistory: conditions,
          groups: [...selectedGroups],
          pastDiseases: diseases,
          allergies,
          previousMedicineIntake: form.previousMedicineIntake || null,
          baselineVitals: {
            heightCm: form.heightCm === '' ? null : Number(form.heightCm),
            weightKg: form.weightKg === '' ? null : Number(form.weightKg),
            bloodPressure: form.bloodPressure.trim() || null,
            bloodSugar: form.bloodSugar === '' ? null : Number(form.bloodSugar),
            pulseRate: form.pulseRate === '' ? null : Number(form.pulseRate),
            spo2: form.spo2 === '' ? null : Number(form.spo2),
          },
          generalNotes: form.generalNotes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(data.patient);
      } else {
        setError(data.error || 'Failed to save patient');
      }
    } catch {
      setError('Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  const filteredSuggestions = conditionSuggestions.filter(
    (s) =>
      conditionInput.trim().length > 0 &&
      s.toLowerCase().includes(conditionInput.trim().toLowerCase()) &&
      !conditions.some((c) => c.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Edit Patient Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <CollapsibleSection title="Basic Info" open={openSections.BASIC} onToggle={() => toggleSection('BASIC')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={form.name}
                  onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Gender *</label>
                <select className={inputCls} value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" className={inputCls} value={form.dateOfBirth}
                  onChange={(e) => setField('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Age</label>
                <input type="number" min="0" className={inputCls} value={form.age}
                  onChange={(e) => setField('age', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Blood Group</label>
                <select className={inputCls} value={form.bloodGroup}
                  onChange={(e) => setField('bloodGroup', e.target.value)}>
                  <option value="">—</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Anniversary</label>
                <input type="date" className={inputCls} value={form.anniversary}
                  onChange={(e) => setField('anniversary', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Language Preference</label>
                <input className={inputCls} value={form.languagePreference}
                  onChange={(e) => setField('languagePreference', e.target.value)} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Patient Groups
              </h4>
              {allGroups.length === 0 ? (
                <p className="text-xs text-gray-400">No groups configured for this clinic.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selectedGroups.has(g.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Contact */}
          <CollapsibleSection title="Contact Details" open={openSections.CONTACT} onToggle={() => toggleSection('CONTACT')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Primary Phone *</label>
                <input className={inputCls} value={form.primaryPhone}
                  onChange={(e) => setField('primaryPhone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Secondary Phone</label>
                <input className={inputCls} value={form.secondaryPhone}
                  onChange={(e) => setField('secondaryPhone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={form.email}
                  onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Referred By</label>
                <input className={inputCls} value={form.referredByName}
                  onChange={(e) => setField('referredByName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className={labelCls}>Street</label>
                <input className={inputCls} value={form.street}
                  onChange={(e) => setField('street', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Locality</label>
                <input className={inputCls} value={form.locality}
                  onChange={(e) => setField('locality', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={form.city}
                  onChange={(e) => setField('city', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input className={inputCls} value={form.pincode}
                  onChange={(e) => setField('pincode', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Medical History */}
          <CollapsibleSection title="Medical History" open={openSections.MEDICAL} onToggle={() => toggleSection('MEDICAL')}>
            <p className="text-xs text-gray-400 mb-2">
              Type a condition and press Add. Suggestions appear as you type.
            </p>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {conditions.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-full"
                  >
                    {c}
                    <button onClick={() => removeCondition(c)} className="hover:text-red-900 font-bold">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="e.g. Diabetes, Hypertension..."
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCondition(conditionInput);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addCondition(conditionInput)}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-14 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addCondition(s)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <TagEditor
                label="Past Diseases"
                placeholder="Add disease (e.g. Arthritis)"
                suggestions={COMMON_DISEASES}
                tags={diseases}
                input={tagInput.diseases}
                setInput={(v) => setTagInput((prev) => ({ ...prev, diseases: v }))}
                onAdd={(v) => addTag('diseases', v, diseases, setDiseases)}
                onRemove={(name) => removeTag(diseases, setDiseases, name)}
              />
              <TagEditor
                label="Allergies"
                placeholder="Add allergy"
                suggestions={COMMON_ALLERGIES}
                tags={allergies}
                input={tagInput.allergies}
                setInput={(v) => setTagInput((prev) => ({ ...prev, allergies: v }))}
                onAdd={(v) => addTag('allergies', v, allergies, setAllergies)}
                onRemove={(name) => removeTag(allergies, setAllergies, name)}
              />
            </div>

            <div className="mt-4">
              <label className={labelCls}>Previous Medicine Intake</label>
              <AutoTextarea
                value={form.previousMedicineIntake}
                onChange={(v) => setField('previousMedicineIntake', v)}
                minRows={3}
                placeholder="Medicines taken previously (names, dosages, period)..."
              />
            </div>
            <div className="mt-3">
              <label className={labelCls}>Other History</label>
              <AutoTextarea
                value={form.otherHistory}
                onChange={(v) => setField('otherHistory', v)}
                minRows={3}
                placeholder="Any other relevant medical history..."
              />
            </div>
          </CollapsibleSection>

          {/* Baseline Vital Signs */}
          <CollapsibleSection title="Baseline Vital Signs" open={openSections.VITALS} onToggle={() => toggleSection('VITALS')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Height (cm)</label>
                <input type="number" min="0" step="0.1" className={inputCls} value={form.heightCm}
                  onChange={(e) => setField('heightCm', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Weight (kg)</label>
                <input type="number" min="0" step="0.1" className={inputCls} value={form.weightKg}
                  onChange={(e) => setField('weightKg', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Blood Pressure (mmHg)</label>
                <input placeholder="120/80" className={inputCls} value={form.bloodPressure}
                  onChange={(e) => setField('bloodPressure', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Blood Sugar (mg/dL)</label>
                <input type="number" min="0" className={inputCls} value={form.bloodSugar}
                  onChange={(e) => setField('bloodSugar', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Pulse Rate (bpm)</label>
                <input type="number" min="0" className={inputCls} value={form.pulseRate}
                  onChange={(e) => setField('pulseRate', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>SpO₂ (%)</label>
                <input type="number" min="0" max="100" className={inputCls} value={form.spo2}
                  onChange={(e) => setField('spo2', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Additional Notes */}
          <CollapsibleSection title="Additional Notes" open={openSections.NOTES} onToggle={() => toggleSection('NOTES')}>
            <AutoTextarea
              value={form.generalNotes}
              onChange={(v) => setField('generalNotes', v)}
              minRows={5}
              placeholder="General notes about the patient (e.g. nervous about needles, prefers morning appointments)..."
            />
          </CollapsibleSection>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
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
