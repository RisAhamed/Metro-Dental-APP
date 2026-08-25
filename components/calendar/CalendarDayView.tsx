'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Zap } from 'lucide-react';
import type { CalendarAppointment } from './types';

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 44;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

function slotLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:00 ${ampm}`;
}

interface CalendarDayViewProps {
  date: Date;
  appointments: CalendarAppointment[];
  onSlotClick: (slotDate: Date) => void;
  onAppointmentClick: (appt: CalendarAppointment, e: React.MouseEvent) => void;
  onAppointmentMouseEnter?: (appt: CalendarAppointment, e: React.MouseEvent) => void;
  onAppointmentMouseLeave?: () => void;
}

export function CalendarDayView({
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onAppointmentMouseEnter,
  onAppointmentMouseLeave,
}: CalendarDayViewProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * SLOT_MINUTES;
    return {
      hour: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  });

  const dayKey = format(date, 'yyyy-MM-dd');
  const dayAppointments = appointments
    .filter((a) => format(new Date(a.appointmentDate), 'yyyy-MM-dd') === dayKey)
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  const isToday =
    format(now, 'yyyy-MM-dd') === dayKey &&
    now.getHours() >= START_HOUR &&
    now.getHours() <= END_HOUR;
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="w-16 flex-shrink-0" />
        <div className="flex-1 py-2 text-center">
          <span className="text-xs uppercase tracking-wide font-medium text-gray-500">
            {format(date, 'EEEE')}
          </span>
          <div className="text-lg font-bold leading-tight text-gray-800">{format(date, 'd MMM yyyy')}</div>
        </div>
      </div>

      <div className="flex overflow-y-auto overflow-x-auto max-h-[calc(100vh-300px)] min-h-[400px] relative">
        <div className="w-16 flex-shrink-0 bg-gray-50/50">
          {slots.map((slot, i) => (
            <div
              key={i}
              style={{ height: SLOT_HEIGHT }}
              className="px-1.5 text-[10px] text-gray-400 text-right leading-none pt-1"
            >
              {slot.minutes === 0 && slotLabel(slot.hour)}
            </div>
          ))}
        </div>

        <div className="flex-1 relative" style={{ minHeight: TOTAL_SLOTS * SLOT_HEIGHT }}>
          {isToday && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
              <div className="relative h-0 border-t-2 border-red-500">
                <span className="absolute -top-[5px] -left-1 w-2 h-2 rounded-full bg-red-500" />
                <span className="absolute -top-4 right-1 text-[10px] font-semibold text-red-500 bg-white/90 px-1 rounded">
                  {format(now, 'h:mm a')}
                </span>
              </div>
            </div>
          )}

          {slots.map((slot, i) => (
            <div
              key={i}
              onClick={() =>
                onSlotClick(new Date(date.getFullYear(), date.getMonth(), date.getDate(), slot.hour, slot.minutes))
              }
              style={{ height: SLOT_HEIGHT }}
              title={`Book ${format(date, 'EEE d')} at ${slot.hour}:${String(slot.minutes).padStart(2, '0')}`}
              className={`border-b cursor-pointer transition-colors hover:bg-blue-100/60 ${
                slot.minutes === 0 ? 'border-gray-200' : 'border-gray-100'
              }`}
            />
          ))}

          {dayAppointments.map((appt) => {
            const apptDate = new Date(appt.appointmentDate);
            const minutes = apptDate.getHours() * 60 + apptDate.getMinutes() - START_HOUR * 60;
            const top = Math.max((minutes / SLOT_MINUTES) * SLOT_HEIGHT, 0);
            const height = Math.max((appt.durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT, 28);
            const isHex = appt.categoryColor?.startsWith('#');
            return (
              <div
                key={appt.appointmentId}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(appt, e);
                }}
                onMouseEnter={onAppointmentMouseEnter ? (e) => onAppointmentMouseEnter(appt, e) : undefined}
                onMouseLeave={onAppointmentMouseLeave}
                className={`absolute left-1 right-1 rounded-md px-2 py-1 text-white text-xs cursor-pointer overflow-hidden shadow-sm hover:brightness-110 hover:z-30 transition z-10 ${
                  isHex ? '' : appt.categoryColor || 'bg-blue-500'
                }`}
                style={isHex ? { top, height, backgroundColor: appt.categoryColor! } : { top, height }}
              >
                <div className="flex items-center gap-1 font-semibold truncate text-sm">
                  {appt.isWalkIn && <Zap className="h-3 w-3 flex-shrink-0 fill-yellow-300 text-yellow-300" />}
                  <span className="truncate">
                    {appt.patientName} — {appt.categoryName || 'Appointment'}
                  </span>
                  <span className="ml-auto text-[10px] opacity-80">{format(apptDate, 'h:mm a')}</span>
                </div>
                <div className="opacity-90 truncate text-[11px]">Dr. {appt.doctorName} • {appt.durationMinutes} min • {appt.status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { START_HOUR as DAY_START_HOUR };
