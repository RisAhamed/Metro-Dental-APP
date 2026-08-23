'use client';

import { format } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';
import { StatusBadge, EmptyState, formatDateDDMMM } from './shared';

export interface PatientAppointment {
  appointmentId: string;
  appointmentDate: string;
  doctorName: string;
  categoryName: string | null;
  status: string;
  isWalkIn: boolean;
  tokenNumber: string | null;
  durationMinutes: number;
}

interface PatientAppointmentsProps {
  appointments: PatientAppointment[];
  loading: boolean;
  onAdd: () => void;
}

export function PatientAppointments({
  appointments,
  loading,
  onAdd,
}: PatientAppointmentsProps) {
  const sorted = [...appointments].sort(
    (a, b) =>
      new Date(b.appointmentDate).getTime() -
      new Date(a.appointmentDate).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" /> Appointments
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Appointment
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading appointments...</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Calendar} message="No appointments yet." />
      ) : (
        <div className="space-y-2">
          {sorted.map((a) => {
            const date = new Date(a.appointmentDate);
            return (
              <div
                key={a.appointmentId}
                className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateDDMMM(date)} at{' '}
                      {format(date, 'h:mm a')}
                      <span className="text-gray-400 font-normal">
                        {' '}
                        ({a.durationMinutes} min)
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Dr. {a.doctorName}
                      {a.categoryName ? ` • ${a.categoryName}` : ''}
                    </p>
                    {(a.isWalkIn || a.tokenNumber) && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        {a.isWalkIn && (
                          <span className="bg-yellow-100 text-yellow-700 px-1.5 rounded text-[10px] font-medium">
                            WALK-IN
                          </span>
                        )}
                        {a.tokenNumber && <span>Token: {a.tokenNumber}</span>}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
