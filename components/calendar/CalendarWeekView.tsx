'use client';

import { useState, useEffect } from 'react';
import { format, isToday, addDays } from 'date-fns';
import { Zap } from 'lucide-react';
import type { CalendarAppointment } from './types';

const START_HOUR = 7; // 7:00 AM
const END_HOUR = 21; // 9:00 PM
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 44;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function slotLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:00 ${ampm}`;
}

interface CalendarWeekViewProps {
  weekStart: Date;
  appointments: CalendarAppointment[];
  onSlotClick: (slotDate: Date) => void;
  onAppointmentClick: (appt: CalendarAppointment, e: React.MouseEvent) => void;
  onAppointmentMouseEnter?: (appt: CalendarAppointment, e: React.MouseEvent) => void;
  onAppointmentMouseLeave?: () => void;
}

export function CalendarWeekView({
  weekStart,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onAppointmentMouseEnter,
  onAppointmentMouseLeave,
}: CalendarWeekViewProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * SLOT_MINUTES;
    return {
      hour: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  });

  const nowInRange =
    now >= days[0] &&
    now < addDays(days[6], 1) &&
    now.getHours() >= START_HOUR &&
    now.getHours() <= END_HOUR;
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / SLOT_MINUTES) *
    SLOT_HEIGHT;

  const dayAppointmentsFor = (day: Date) =>
    appointments
      .filter(
        (a) =>
          format(new Date(a.appointmentDate), 'yyyy-MM-dd') ===
          format(day, 'yyyy-MM-dd')
      )
      .sort(
        (a, b) =>
          new Date(a.appointmentDate).getTime() -
          new Date(b.appointmentDate).getTime()
      );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
        <div className="w-12 sm:w-16 flex-shrink-0" />
        {days.map((day, i) => (
          <div
            key={day.toString()}
            className={`flex-1 py-1.5 sm:py-2 text-center border-l border-gray-100 first:border-l-0 min-w-[56px] sm:min-w-[120px] ${
              isToday(day) ? 'bg-blue-50' : ''
            }`}
          >
            <span
              className={`text-[10px] sm:text-xs uppercase tracking-wide font-medium ${
                isToday(day) ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="hidden sm:inline">{DAY_HEADERS[i]}</span>
              <span className="sm:hidden">{DAY_HEADERS[i].charAt(0)}</span>
            </span>
            <div
              className={`text-base sm:text-lg font-bold leading-tight ${
                isToday(day) ? 'text-blue-600' : 'text-gray-800'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto overflow-x-auto max-h-[50vh] sm:max-h-[calc(100vh-300px)] min-h-[300px] sm:min-h-[400px] relative">
        {/* Time gutter */}
        <div className="w-12 sm:w-16 flex-shrink-0 bg-gray-50/50">
          {slots.map((slot, i) => (
            <div
              key={i}
              style={{ height: SLOT_HEIGHT }}
              className="px-1 sm:px-1.5 text-[9px] sm:text-[10px] text-gray-400 text-right leading-none pt-1"
            >
              {slot.minutes === 0 && <span className="hidden sm:inline">{slotLabel(slot.hour)}</span>}
              {slot.minutes === 0 && <span className="sm:hidden text-[8px]">{slot.hour > 12 ? slot.hour - 12 : slot.hour}</span>}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 flex relative">
          {nowInRange && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="relative h-0 border-t-2 border-red-500">
                <span className="absolute -top-[5px] -left-1 w-2 h-2 rounded-full bg-red-500" />
                <span className="absolute -top-4 right-1 text-[10px] font-semibold text-red-500 bg-white/90 px-1 rounded">
                  {format(now, 'h:mm a')}
                </span>
              </div>
            </div>
          )}

          {days.map((day) => {
            const dayAppointments = dayAppointmentsFor(day);
            return (
              <div
                key={day.toString()}
                style={{ minHeight: TOTAL_SLOTS * SLOT_HEIGHT }}
                className={`flex-1 relative border-l border-gray-100 first:border-l-0 min-w-[56px] sm:min-w-[120px] ${
                  isToday(day) ? 'bg-blue-50/40' : ''
                }`}
              >
                {/* Clickable half-hour slots */}
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      onSlotClick(
                        new Date(
                          day.getFullYear(),
                          day.getMonth(),
                          day.getDate(),
                          slot.hour,
                          slot.minutes
                        )
                      )
                    }
                    style={{ height: SLOT_HEIGHT }}
                    title={`Book ${format(day, 'EEE d')} at ${slot.hour}:${String(slot.minutes).padStart(2, '0')}`}
                    className={`border-b cursor-pointer transition-colors hover:bg-blue-100/60 ${
                      slot.minutes === 0 ? 'border-gray-200' : 'border-gray-100'
                    }`}
                  />
                ))}

                {/* Appointments */}
                {dayAppointments.map((appt) => {
                  const date = new Date(appt.appointmentDate);
                  const minutes =
                    date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
                  const top = Math.max((minutes / SLOT_MINUTES) * SLOT_HEIGHT, 0);
                  const height = Math.max(
                    (appt.durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT,
                    26
                  );
                  const isHex = appt.categoryColor?.startsWith('#');
                  return (
                    <div
                      key={appt.appointmentId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt, e);
                      }}
                      onMouseEnter={
                        onAppointmentMouseEnter
                          ? (e) => onAppointmentMouseEnter(appt, e)
                          : undefined
                      }
                      onMouseLeave={onAppointmentMouseLeave}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-white text-[11px] cursor-pointer overflow-hidden shadow-sm hover:brightness-110 hover:z-30 transition z-10 ${
                        isHex ? '' : appt.categoryColor || 'bg-blue-500'
                      }`}
                      style={
                        isHex
                          ? { top, height, backgroundColor: appt.categoryColor! }
                          : { top, height }
                      }
                    >
                      <div className="flex items-center gap-1 font-semibold truncate">
                        {appt.isWalkIn && (
                          <Zap className="h-3 w-3 flex-shrink-0 fill-yellow-300 text-yellow-300" />
                        )}
                        <span className="truncate">{appt.patientName}</span>
                      </div>
                      {height > 40 && (
                        <div className="opacity-90 truncate">
                          {format(date, 'h:mm a')}
                          {appt.categoryName ? ` · ${appt.categoryName}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { START_HOUR, END_HOUR, SLOT_HEIGHT, SLOT_MINUTES };
