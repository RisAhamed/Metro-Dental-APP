'use client';

export interface VitalSigns {
  age: number | null;
  weight: number | null;
  bloodPressure: string | null;
  bloodSugar: number | null;
  pulseRate: number | null;
  spo2: number | null;
}

interface VitalSignsInputProps {
  value: VitalSigns;
  onChange: (value: VitalSigns) => void;
  disabled?: boolean;
}

const FIELDS: Array<{ key: keyof VitalSigns; label: string; placeholder: string; type?: string }> = [
  { key: 'age', label: 'Age (years)', placeholder: 'e.g. 35', type: 'number' },
  { key: 'weight', label: 'Weight (kg)', placeholder: 'e.g. 65', type: 'number' },
  { key: 'bloodPressure', label: 'Blood Pressure', placeholder: 'e.g. 120/80', type: 'text' },
  { key: 'bloodSugar', label: 'Blood Sugar (mg/dL)', placeholder: 'e.g. 110', type: 'number' },
  { key: 'pulseRate', label: 'Pulse Rate (bpm)', placeholder: 'e.g. 72', type: 'number' },
  { key: 'spo2', label: 'SPO2 (%)', placeholder: 'e.g. 98', type: 'number' },
];

export function VitalSignsInput({ value, onChange, disabled }: VitalSignsInputProps) {
  const set = (key: keyof VitalSigns, raw: string) => {
    if (key === 'bloodPressure') {
      onChange({ ...value, bloodPressure: raw || null });
      return;
    }
    const num = raw === '' ? null : Number(raw);
    onChange({ ...value, [key]: Number.isNaN(num) ? null : num });
  };

  const numVal = (v: number | null) => (v === null || v === undefined ? '' : String(v));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
          <input
            type={field.type || 'number'}
            disabled={disabled}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={field.key === 'bloodPressure' ? value.bloodPressure || '' : numVal(value[field.key] as number | null)}
            onChange={(e) => set(field.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}