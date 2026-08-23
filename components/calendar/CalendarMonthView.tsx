'use client';

import { format, isSameDay, isSameMonth, addDays, startOfWeek, startOfMonth } from 'date-fns';
import { Zap } from 'lucide-react';
import type { CalendarAppointment } from './types';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function blockColor(appt: CalendarAppointment): React.CSSProperties {
  if (appt.categoryColor?.startsWith('#')) {
    return { backgroundColor: appt.categoryColor };
  }
  const classColors: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-yellow-500': '#eab308',
    'bg-emerald-700': '#047857',
    'bg-red-500': '#ef4444',
    'bg-gray-400': '#9ca3af',
  };
  return { backgroundColor: classColors[appt.categoryColor || ''] || appt.categoryColor || '#3b82f6' };
}

interface CalendarMonthViewProps {
  currentDate: Date;
  appointments: CalendarAppointment[];
  onDateClick: (day: Date) => void;
  onAppointmentClick: (appt: CalendarAppointment, e: React.MouseEvent) => void;
}

export function CalendarMonthView({
  currentDate,
  appointments,
  onDateClick,
  onAppointmentClick,
}: CalendarMonthViewProps) {
  // Week starts on Sunday
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointments
            .filter((a) => isSameDay(new Date(a.appointmentDate), day))
            .sort(
              (a, b) =>
                new Date(a.appointmentDate).getTime() -
                new Date(b.appointmentDate).getTime()
            );
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toString()}
              onClick={() => onDateClick(day)}
              className={`border-b border-r border-gray-100 last:border-r-0 min-h-[96px] p-1 cursor-pointer transition-colors hover:bg-blue-50/50 ${
                !inMonth ? 'bg-gray-50/70 text-gray-400' : ''
              } ${isToday ? 'bg-blue-50/60' : ''}`}
            >
              <div
                className={`text-xs font-semibold mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : inMonth
                    ? 'text-gray-700'
                    : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </div>
              {dayAppointments.slice(0, 3).map((appt) => (
                <div
                  key={appt.appointmentId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(appt, e);
                  }}
                  style={blockColor(appt)}
                  className="text-white text-[11px] px-1.5 py-0.5 rounded mb-1 cursor-pointer truncate flex items-center gap-1 hover:brightness-110"
                >
                  {appt.isWalkIn && <Zap className="h-3 w-3 flex-shrink-0 fill-white" />}
                  <span className="truncate">
                    {format(new Date(appt.appointmentDate), 'HH:mm')} {appt.patientName}
                  </span>
                </div>
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-[10px] text-gray-500">
                  +{dayAppointments.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
