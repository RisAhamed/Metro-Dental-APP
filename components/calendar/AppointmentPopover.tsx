'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { X, Phone, Mail, Tag, Stethoscope, Edit, Banknote, Ban, IndianRupee } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import type { CalendarAppointment } from './types';

interface PatientDetails {
  gender?: string | null;
  age?: number | null;
  primaryPhone?: string | null;
  email?: string | null;
  totalDue?: string | null;
  advanceBalance?: string | null;
}

const NEXT_STATUSES: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

interface AppointmentPopoverProps {
  appointment: CalendarAppointment;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function AppointmentPopover({
  appointment,
  position,
  onClose,
  onEdit,
  onStatusChange,
  onMouseEnter,
  onMouseLeave,
}: AppointmentPopoverProps) {
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const role = String(sessionClaims?.role || '');
  const canManageBilling = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(role);

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${appointment.patientId}`);
        const data = await res.json();
        if (!cancelled && res.ok) setPatient(data.patient || null);
      } catch {
        // Popover still works without patient details
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appointment.patientId]);

  const initials = appointment.patientName
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const genderAge = [
    patient?.gender ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : null,
    patient?.age != null ? `${patient.age} yrs` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const handleNoShow = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NO_SHOW' }),
      });
      if (res.ok) {
        onStatusChange('NO_SHOW');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to mark as no-show');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setUpdating(false);
      setConfirmNoShow(false);
    }
  };

  const popoverLeft =
    typeof window !== 'undefined'
      ? Math.max(Math.min(position.x, window.innerWidth - 336), 8)
      : position.x;

  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ top: Math.max(position.y, 8), left: popoverLeft }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <button
                onClick={() => router.push(`/patients/${appointment.patientId}/profile`)}
                className="font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left truncate block max-w-full"
              >
                {appointment.patientName}
              </button>
              <p className="text-sm text-gray-500">{appointment.patientId}</p>
              {genderAge && <p className="text-xs text-gray-500">{genderAge}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Balance */}
        <div className="mt-2">
          {showBalance ? (
            <p className="text-sm flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" />
              Due:{' '}
              <span
                className={`font-semibold ${
                  Number(patient?.totalDue || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                ₹{Number(patient?.totalDue || 0).toFixed(2)}
              </span>
            </p>
          ) : (
            <button
              onClick={() => setShowBalance(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Show Balance
            </button>
          )}
        </div>

        {/* Contact */}
        <div className="mt-2 space-y-1">
          {patient?.primaryPhone && (
            <p className="text-sm text-gray-600 flex items-center gap-2 truncate">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" /> {patient.primaryPhone}
            </p>
          )}
          {patient?.email && (
            <p className="text-sm text-gray-600 flex items-center gap-2 truncate">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" /> {patient.email}
            </p>
          )}
          {(appointment.tokenNumber || appointment.isWalkIn) && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 flex-shrink-0" />
              Token: <span className="font-mono bg-gray-100 px-1.5 rounded">{appointment.tokenNumber || '—'}</span>
              {appointment.isWalkIn && (
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">WALK-IN</span>
              )}
            </p>
          )}
        </div>

        {/* Appointment summary */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-800">In-Clinic Appointment</p>
          <p className="text-sm text-gray-500 mt-0.5 flex items-start gap-1.5">
            <Stethoscope className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              with{' '}
              <button
                onClick={() => router.push('/admin/users')}
                className="font-medium text-blue-600 hover:underline"
              >
                Dr. {appointment.doctorName}
              </button>{' '}
              at {format(new Date(appointment.appointmentDate), 'h:mm a')} for{' '}
              {appointment.durationMinutes} mins
            </span>
          </p>
          {appointment.categoryName && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Tag className="h-4 w-4 flex-shrink-0" />
              Category:{' '}
              <span className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: appointment.categoryColor || '#6B7280' }}
                />
                {appointment.categoryName}
              </span>
            </p>
          )}
          {appointment.notes && (
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">{appointment.notes}</p>
          )}
        </div>

        {/* Status quick actions */}
        {(NEXT_STATUSES[appointment.status]?.length ?? 0) > 0 && (
          <div className="mt-3 flex gap-1.5">
            {NEXT_STATUSES[appointment.status].map((s) => (
              <button
                key={s}
                disabled={updating}
                onClick={() => onStatusChange(s)}
                className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
                  s === 'IN_PROGRESS'
                    ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                    : s === 'COMPLETED'
                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'IN_PROGRESS'
                  ? 'Check In'
                  : s === 'COMPLETED'
                  ? 'Check Out'
                  : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {!confirmNoShow ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              disabled={updating}
              onClick={() => setConfirmNoShow(true)}
              className="px-2 py-2 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" /> No Show
            </button>
            <button
              onClick={onEdit}
              className="px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() =>
                router.push(
                  `/patients/${appointment.patientId}/billing/invoices/new?appointmentId=${appointment.appointmentId}`
                )
              }
              disabled={!canManageBilling}
              title={canManageBilling ? undefined : 'Not permitted'}
              className="px-2 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Banknote className="h-4 w-4" /> Payment
            </button>
          </div>
        ) : (
          <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700 mb-2">
              Mark this appointment as a no-show?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmNoShow(false)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleNoShow}
                disabled={updating}
                className="flex-1 px-2 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Yes, No Show'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
