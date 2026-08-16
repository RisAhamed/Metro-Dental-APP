'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface InvolvedDoctor {
  doctorId: string;
  doctorName: string;
  role: string;
}

interface DoctorsMultiSelectProps {
  clinicId: string;
  value: InvolvedDoctor[];
  onChange: (doctors: InvolvedDoctor[]) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS = [
  'Orthodontist',
  'Periodontist',
  'Endodontist',
  'Prosthodontist',
  'Oral Surgeon',
  'Pedodontist',
  'General Dentist',
  'Oral Medicine',
  'Implantologist',
];

export function DoctorsMultiSelect({ clinicId, value, onChange, disabled }: DoctorsMultiSelectProps) {
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?clinicId=${clinicId}&role=GENERAL_DOCTOR&role=CLINIC_ADMIN`);
        const data = await res.json();
        setDoctors(data.users || []);
      } catch (error) {
        console.error('Error loading doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clinicId]);

  const isSelected = (id: string) => value.some((d) => d.doctorId === id);

  const toggle = (doc: { id: string; name: string }) => {
    if (disabled) return;
    if (isSelected(doc.id)) {
      onChange(value.filter((d) => d.doctorId !== doc.id));
    } else {
      onChange([...value, { doctorId: doc.id, doctorName: doc.name, role: 'General Dentist' }]);
    }
  };

  const setRole = (doctorId: string, role: string) => {
    onChange(value.map((d) => (d.doctorId === doctorId ? { ...d, role } : d)));
  };

  const remove = (doctorId: string) => {
    onChange(value.filter((d) => d.doctorId !== doctorId));
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading doctors...</p>;
  }

  if (doctors.length === 0) {
    return <p className="text-sm text-gray-500">No doctors available in this clinic.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {doctors.map((doc) => (
          <button
            key={doc.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(doc)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              isSelected(doc.id)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            {doc.name}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((doc) => (
            <div key={doc.doctorId} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <span className="text-sm font-medium text-gray-800 flex-1">{doc.doctorName}</span>
              <select
                disabled={disabled}
                value={doc.role}
                onChange={(e) => setRole(doc.doctorId, e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(doc.doctorId)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}