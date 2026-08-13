'use client';

import { format } from 'date-fns';
import { X, Clock, User, Edit, Banknote } from 'lucide-react';

interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  durationMinutes: number;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  tokenNumber: string | null;
  notes: string | null;
}

interface AppointmentPopoverProps {
  appointment: Appointment;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onCollectPayment: () => void;
}

export function AppointmentPopover({
  appointment,
  position,
  onClose,
  onEdit,
  onCollectPayment,
}: AppointmentPopoverProps) {
  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ top: position.y, left: position.x }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {appointment.patientName.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
              <p className="text-sm text-gray-500">{appointment.patientId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(appointment.appointmentDate), 'hh:mm a')}</span>
            <span>•</span>
            <span>{appointment.durationMinutes} min</span>
            {appointment.status && (
              <>
                <span>•</span>
                <span className="font-medium">{appointment.status}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Dr. {appointment.doctorName}</span>
          </div>
          {appointment.categoryName && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: appointment.categoryColor || '#6B7280' }}
              />
              <span className="text-sm text-gray-600">{appointment.categoryName}</span>
            </div>
          )}
          {appointment.tokenNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                {appointment.tokenNumber}
              </span>
            </div>
          )}
          {appointment.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">{appointment.notes}</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={onCollectPayment}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
          >
            <Banknote className="h-4 w-4" /> Collect Payment          </button>
        </div>
      </div>
    </div>
  );
}