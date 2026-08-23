'use client';

import { Activity } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';
import type { ClinicalNoteVisit } from './PatientClinicalNotes';

const VITAL_CARDS: {
  key: keyof NonNullable<ClinicalNoteVisit['vitalSigns']>;
  label: string;
  unit: string;
}[] = [
  { key: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg' },
  { key: 'pulseRate', label: 'Pulse Rate', unit: 'bpm' },
  { key: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'bloodSugar', label: 'Blood Sugar', unit: 'mg/dL' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
];

function hasVitals(v: ClinicalNoteVisit): boolean {
  const vs = v.vitalSigns;
  if (!vs) return false;
  return Object.values(vs).some((val) => val !== null && val !== undefined && val !== '');
}

interface VitalSignsDisplayProps {
  visits: ClinicalNoteVisit[];
  loading: boolean;
}

export function VitalSignsDisplay({ visits, loading }: VitalSignsDisplayProps) {
  const withVitals = visits
    .filter(hasVitals)
    .sort(
      (a, b) =>
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-red-500" /> Vital Signs
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading vital signs...</p>
      ) : withVitals.length === 0 ? (
        <EmptyState icon={Activity} message="No vital signs recorded yet." />
      ) : (
        <div className="space-y-5">
          {withVitals.map((visit) => {
            const vs = visit.vitalSigns!;
            const doctors = (visit.doctorsInvolved || [])
              .map((d) => d.doctorName)
              .filter(Boolean);
            return (
              <div
                key={visit.visitId}
                className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDateDDMMM(visit.visitDate)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {doctors.length > 0 ? `Dr. ${doctors.join(' & ')}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {VITAL_CARDS.map(({ key, label, unit }) => {
                    const value = vs[key];
                    if (value === null || value === undefined || value === '') return null;
                    return (
                      <div
                        key={key}
                        className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center"
                      >
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
                          {label}
                        </p>
                        <p className="mt-1 text-lg font-bold text-gray-800 leading-none">
                          {String(value)}
                          <span className="block mt-0.5 text-[10px] font-medium text-gray-400 normal-case">
                            {unit}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
