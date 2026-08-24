'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay, parseISO } from 'date-fns';
import { Zap, Plus } from 'lucide-react';
import type { CalendarAppointment, CalendarStats } from './types';

type StatTab = 'ALL' | 'ONLINE' | 'OFFLINE';

const STATUS_OPTIONS = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'] as const;

function statusDot(status: string): { color: string; label: string; chip: string } {
  switch (status) {
    case 'SCHEDULED':
    case 'CONFIRMED':
      return { color: 'bg-green-500', label: 'Waiting', chip: 'bg-green-50 text-green-700 border border-green-200' };
    case 'IN_PROGRESS':
      return { color: 'bg-yellow-500', label: 'Engaged', chip: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
    case 'COMPLETED':
      return { color: 'bg-emerald-700', label: 'Done', chip: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    default:
      return { color: 'bg-gray-400', label: status, chip: 'bg-gray-100 text-gray-600 border border-gray-200' };
  }
}

interface SidebarStatsProps {
  stats: CalendarStats | null;
  appointments: CalendarAppointment[];
  loading: boolean;
  selectedDate: Date;
  onWalkIn: () => void;
  onStatusChange: (appointmentId: string, status: string) => void;
  onAppointmentClick: (appt: CalendarAppointment, e: React.MouseEvent) => void;
}

export function SidebarStats({
  stats,
  appointments,
  loading,
  selectedDate,
  onWalkIn,
  onStatusChange,
  onAppointmentClick,
}: SidebarStatsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<StatTab>('ALL');
  const [visibleCount, setVisibleCount] = useState(8);
  const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);

  const isTodayView = isSameDay(selectedDate, new Date());
  const panelTitle = isTodayView
    ? "Today's Schedule"
    : format(selectedDate, 'EEE, MMM d yyyy');

  const filtered = appointments.filter((a) => {
    if (tab === 'ONLINE') return !a.isWalkIn;
    if (tab === 'OFFLINE') return a.isWalkIn;
    return true;
  });
  const visible = filtered.slice(0, visibleCount);

  const tabs: { key: StatTab; count: number }[] = [
    { key: 'ALL', count: appointments.length },
    { key: 'ONLINE', count: appointments.filter((a) => !a.isWalkIn).length },
    { key: 'OFFLINE', count: appointments.filter((a) => a.isWalkIn).length },
  ];

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow p-4 h-[calc(100vh-160px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{panelTitle}</h3>
      </div>

      <button
        onClick={onWalkIn}
        className="w-full mb-4 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
      >
        <Plus className="h-4 w-4" /> Add Walk-in Appointment
      </button>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-3">
        {tabs.map(({ key, count }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setVisibleCount(8);
            }}
            className={`px-3 py-2 text-sm capitalize ${
              tab === key
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {key.toLowerCase()} ({count})
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(
          [
            { key: 'TODAY', label: 'TODAY', value: stats?.TODAY ?? 0 },
            { key: 'WAITING', label: 'WAITING', value: stats?.WAITING ?? 0 },
            { key: 'ENGAGED', label: 'ENGAGED', value: stats?.ENGAGED ?? 0 },
            { key: 'DONE', label: 'DONE', value: stats?.DONE ?? 0 },
          ] as const
        ).map((s) => (
          <div key={s.key} className="text-center py-2 rounded-md bg-gray-50">
            <p className="text-lg font-bold text-gray-800">{s.value}</p>
            <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Appointments</h4>

      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          No appointments {isTodayView ? 'today' : 'on this day'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((appt) => {
            const dot = statusDot(appt.status);
            const date = parseISO(appt.appointmentDate);
            return (
              <div
                key={appt.appointmentId}
                className="rounded-md border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 p-2 cursor-pointer transition-colors relative"
                onClick={(e) => onAppointmentClick(appt, e)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-700 w-12 flex-shrink-0 pt-0.5">
                    {isSameDay(date, selectedDate) ? format(date, 'HH:mm') : format(date, 'd MMM')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/patients/${appt.patientId}/profile`);
                        }}
                        title="Open patient profile"
                        className="font-medium text-sm text-gray-900 truncate hover:text-blue-600 hover:underline"
                      >
                        {appt.patientName.toUpperCase()}
                      </button>
                      {appt.isWalkIn && (
                        <Zap className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      )}
                      <span
                        className={`ml-auto w-2.5 h-2.5 rounded-full ${dot.color} flex-shrink-0`}
                        title={dot.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusMenuFor(
                            statusMenuFor === appt.appointmentId ? null : appt.appointmentId
                          );
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {appt.categoryName || 'Appointment'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">Dr. {appt.doctorName}</p>

                    {/* Status badge + quick actions */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${dot.chip}`}
                      >
                        {dot.label}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {(appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED') && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(appt.appointmentId, 'IN_PROGRESS');
                              }}
                              title="Patient is with the doctor"
                              className="px-2 py-0.5 text-[10px] rounded border border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-colors"
                            >
                              Check In
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusMenuFor(
                                  statusMenuFor === appt.appointmentId ? null : appt.appointmentId
                                );
                              }}
                              title="More status options"
                              className="px-2 py-0.5 text-[10px] rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              No Show
                            </button>
                          </>
                        )}
                        {appt.status === 'IN_PROGRESS' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(appt.appointmentId, 'COMPLETED');
                            }}
                            title="Appointment finished"
                            className="px-2 py-0.5 text-[10px] rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                          >
                            Check Out
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {statusMenuFor === appt.appointmentId && (
                  <div
                    className="absolute right-2 top-8 z-30 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        disabled={s === appt.status}
                        onClick={() => {
                          onStatusChange(appt.appointmentId, s);
                          setStatusMenuFor(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-40 ${
                          s === 'NO_SHOW' ? 'text-red-600' : 'text-gray-700'
                        }`}
                      >
                        {s === appt.status ? `✓ ${s.replace('_', ' ')}` : `Mark ${s.replace('_', ' ')}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + 8)}
              className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
              Load More...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
