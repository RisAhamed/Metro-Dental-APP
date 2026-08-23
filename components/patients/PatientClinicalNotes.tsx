'use client';

import { Activity, FileText } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';

export interface VisitVitalSigns {
  age?: number | null;
  weight?: number | null;
  bloodPressure?: string | null;
  bloodSugar?: number | null;
  pulseRate?: number | null;
  spo2?: number | null;
}

export interface ClinicalNoteVisit {
  visitId: string;
  visitDate: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  additionalNotes: string | null;
  vitalSigns: VisitVitalSigns | null;
  doctorsInvolved: Array<{ doctorId: string; doctorName: string; role: string }> | null;
}

const VITAL_ROWS: { key: keyof VisitVitalSigns; label: string }[] = [
  { key: 'bloodPressure', label: 'BP' },
  { key: 'pulseRate', label: 'Pulse' },
  { key: 'spo2', label: 'SpO₂' },
  { key: 'bloodSugar', label: 'Blood Sugar' },
  { key: 'weight', label: 'Weight' },
];

interface PatientClinicalNotesProps {
  visits: ClinicalNoteVisit[];
  loading: boolean;
  mode?: 'NOTES' | 'VITALS';
}

export function PatientClinicalNotes({
  visits,
  loading,
  mode = 'NOTES',
}: PatientClinicalNotesProps) {
  const isVitals = mode === 'VITALS';
  const notes = visits.filter((v) =>
    isVitals
      ? !!v.vitalSigns &&
        Object.values(v.vitalSigns).some((val) => val !== null && val !== undefined && val !== '')
      : v.chiefComplaint || v.diagnosis || v.treatmentGiven || v.additionalNotes
  );

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        {isVitals ? (
          <>
            <Activity className="h-5 w-5 text-red-500" /> Vital Signs
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 text-blue-500" /> Clinical Notes
          </>
        )}
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={isVitals ? Activity : FileText}
          message={isVitals ? 'No vital signs recorded yet.' : 'No clinical notes recorded yet.'}
        />
      ) : (
        <div className="space-y-4">
          {notes.map((v) => {
            const doctors = (v.doctorsInvolved || [])
              .map((d) => d.doctorName)
              .filter(Boolean);
            const vitals = v.vitalSigns
              ? VITAL_ROWS.filter((r) => {
                  const val = v.vitalSigns?.[r.key];
                  return val !== null && val !== undefined && val !== '';
                })
                  .map(
                    (r) =>
                      `${r.label}: ${
                        r.key === 'weight' ? `${v.vitalSigns?.[r.key]} kg` : v.vitalSigns?.[r.key]
                      }`
                  )
                  .join(' • ')
              : null;

            return (
              <div
                key={v.visitId}
                className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
              >
                <p className="text-xs text-gray-400">{formatDateDDMMM(v.visitDate)}</p>

                <dl className="mt-2 space-y-1.5 text-sm">
                  {v.chiefComplaint && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Chief Complaint
                      </dt>
                      <dd className="text-gray-700">{v.chiefComplaint}</dd>
                    </div>
                  )}
                  {v.diagnosis && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Diagnosis
                      </dt>
                      <dd className="text-gray-700">{v.diagnosis}</dd>
                    </div>
                  )}
                  {v.treatmentGiven && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Treatment Given
                      </dt>
                      <dd className="text-gray-700">{v.treatmentGiven}</dd>
                    </div>
                  )}
                  {v.additionalNotes && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Additional Notes
                      </dt>
                      <dd className="text-gray-700 whitespace-pre-wrap">{v.additionalNotes}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-3 pt-2 border-t border-gray-50 space-y-1">
                  {vitals && <p className="text-xs text-gray-500">🩺 {vitals}</p>}
                  {doctors.length > 0 && (
                    <p className="text-xs text-gray-500">Dr. {doctors.join(' & ')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
