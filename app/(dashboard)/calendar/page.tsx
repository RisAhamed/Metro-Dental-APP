'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMobile } from '@/hooks/useMobile';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import { SidebarStats } from '@/components/calendar/SidebarStats';
import type { CalendarAppointment, CalendarStats } from '@/components/calendar/types';
import { AppointmentPopover } from '@/components/calendar/AppointmentPopover';
import { AppointmentModal } from '@/components/calendar/AppointmentModal';

interface Doctor {
  id: string;
  name: string;
  clinicId: string;
}

interface Reminder {
  reminderId: string;
  title: string;
  doctorName: string | null;
  isAllDay: boolean;
  startDate: string;
  endDate: string;
}

const HOVER_OPEN_DELAY = 350;
const HOVER_CLOSE_DELAY = 250;

export default function CalendarPage() {
  const { sessionClaims } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarAppointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<CalendarAppointment | null>(null);
  const [modalPrefill, setModalPrefill] = useState<{
    date?: string;
    time?: string;
    doctorId?: string;
    isWalkIn?: boolean;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [dayAppointments, setDayAppointments] = useState<CalendarAppointment[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDoctorsPanel, setShowDoctorsPanel] = useState(true);

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const isMobile = useMobile();

  // ---------- Data loading ----------
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { start, end } = getRangeForView(view, currentDate);
        let url = `/api/appointments?clinicId=${clinicId}&startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
        if (selectedDoctor !== 'all') {
          url += `&doctorId=${selectedDoctor}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setAppointments(data.appointments || []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [view, currentDate, clinicId, selectedDoctor, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/users?clinicId=${clinicId}&role=GENERAL_DOCTOR&role=CLINIC_ADMIN`
        );
        const data = await res.json();
        if (!cancelled) setDoctors(data.users || []);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/reminders?clinicId=${clinicId}`);
        const data = await res.json();
        if (!cancelled) setReminders(data.reminders || []);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, refreshKey]);

  // Right sidebar: stats + appointments for the selected day
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(
          `/api/appointments/stats?clinicId=${clinicId}&date=${format(selectedDate, 'yyyy-MM-dd')}`
        );
        const data = await res.json();
        if (!cancelled && res.ok) {
          setStats(data.stats || null);
          setDayAppointments(data.appointments || []);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, selectedDate, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ---------- Popover (hover + click) ----------
  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const openPopover = useCallback(
    (appt: CalendarAppointment, rect: DOMRect) => {
      clearHoverTimer();
      const top = rect.bottom + 8;
      const fitsBelow = top + 420 < window.innerHeight;
      setPopoverPosition({
        x: rect.left,
        y: fitsBelow ? top : Math.max(rect.top - 430, 8),
      });
      setSelectedAppointment(appt);
      setShowPopover(true);
    },
    []
  );

  const handleHoverOpen = useCallback(
    (appt: CalendarAppointment, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      clearHoverTimer();
      hoverTimer.current = setTimeout(() => openPopover(appt, rect), HOVER_OPEN_DELAY);
    },
    [openPopover]
  );

  const handleHoverClose = useCallback(() => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setShowPopover(false), HOVER_CLOSE_DELAY);
  }, []);

  const handlePopoverEnter = useCallback(() => clearHoverTimer(), []);
  const handlePopoverLeave = useCallback(() => setShowPopover(false), []);

  const handleAppointmentClick = useCallback(
    (appt: CalendarAppointment, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      openPopover(appt, rect);
    },
    [openPopover]
  );

  useEffect(() => () => clearHoverTimer(), []);

  // ---------- Actions ----------
  const handleSlotClick = (slotDate: Date) => {
    setEditingAppointment(null);
    setModalPrefill({
      date: format(slotDate, 'yyyy-MM-dd'),
      time: format(slotDate, 'HH:mm'),
      doctorId: selectedDoctor !== 'all' ? selectedDoctor : undefined,
      isWalkIn: false,
    });
    setSelectedDate(startOfDay(slotDate));
    setShowModal(true);
  };

  const handleWalkIn = () => {
    const now = new Date();
    const slot = new Date(now);
    slot.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);

    setEditingAppointment(null);
    setModalPrefill({
      date: format(slot, 'yyyy-MM-dd'),
      time: format(slot, 'HH:mm'),
      doctorId: selectedDoctor !== 'all' ? selectedDoctor : undefined,
      isWalkIn: true,
    });
    setShowModal(true);
  };

  const handleBookAppointment = () => {
    const slot = roundToNextSlot(new Date());
    setEditingAppointment(null);
    setModalPrefill({
      date: format(slot, 'yyyy-MM-dd'),
      time: format(slot, 'HH:mm'),
      doctorId: selectedDoctor !== 'all' ? selectedDoctor : undefined,
      isWalkIn: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = () => {
    setShowPopover(false);
    setEditingAppointment(selectedAppointment);
    setModalPrefill({});
    setShowModal(true);
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
        return;
      }
      setShowPopover(false);
      setSelectedAppointment(null);
      refresh();
    } catch {
      alert('An error occurred while updating status');
    }
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingAppointment(null);
    refresh();
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(startOfDay(today));
  };

  const handleMonthDateClick = (day: Date) => {
    setCurrentDate(day);
    setSelectedDate(startOfDay(day));
    setView('week');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate((d) => (direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1)));
    }
  };

  const weekStart = useMemo(
    // Week starts on Sunday
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate]
  );

  return (
    <div className="flex gap-4">
      {/* Left Sidebar — Doctors & Reminders (collapsible) */}
      {showDoctorsPanel && (
        <div className="w-52 flex-shrink-0 bg-white rounded-lg shadow p-4 h-[calc(100vh-160px)] overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-4">Doctors</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedDoctor('all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors truncate ${
                selectedDoctor === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              All Doctors
            </button>
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setSelectedDoctor(doctor.id)}
                title={`Dr. ${doctor.name}`}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors truncate ${
                  selectedDoctor === doctor.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Dr. {doctor.name}
              </button>
            ))}
          </div>

          {!isMobile && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3">Reminders</h3>
              {reminders.length === 0 ? (
                <p className="text-sm text-gray-400">No reminders</p>
              ) : (
                <div className="space-y-2">
                  {reminders.slice(0, 10).map((reminder) => (
                    <div
                      key={reminder.reminderId}
                      className="rounded-md bg-amber-50 border border-amber-200 p-2"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {reminder.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(reminder.startDate), 'MMM d, h:mm a')}
                        {reminder.isAllDay && ' • All Day'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reminder.doctorName || 'All Doctors'}
                      </p>
                    </div>
                  ))}
                  {reminders.length > 10 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{reminders.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Calendar Area */}
      <div className="flex-1 min-w-0 bg-white rounded-lg shadow p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowDoctorsPanel((s) => !s)}
              aria-label={showDoctorsPanel ? 'Hide doctors panel' : 'Show doctors panel'}
              title={showDoctorsPanel ? 'Hide doctors panel' : 'Show doctors panel'}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
            >
              {showDoctorsPanel ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
            <button onClick={() => handleNavigate('prev')} className="p-2 rounded-md hover:bg-gray-100" aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold whitespace-nowrap">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy')
                : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
            </h2>
            <button onClick={() => handleNavigate('next')} className="p-2 rounded-md hover:bg-gray-100" aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={handleToday}
              className="ml-1 px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              {(['week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={handleWalkIn}
              className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 flex items-center gap-1.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Walk-in
            </button>
            <button
              onClick={handleBookAppointment}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Book Appointment
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Loading appointments...
          </div>
        ) : view === 'month' ? (
          <CalendarMonthView
            currentDate={currentDate}
            appointments={appointments}
            onDateClick={handleMonthDateClick}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : (
          <CalendarWeekView
            weekStart={weekStart}
            appointments={appointments}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentMouseEnter={handleHoverOpen}
            onAppointmentMouseLeave={handleHoverClose}
          />
        )}
      </div>

      {/* Right Sidebar — Selected Day Schedule & Stats */}
      {!isMobile && (
        <SidebarStats
          stats={stats}
          appointments={dayAppointments}
          loading={statsLoading}
          selectedDate={selectedDate}
          onWalkIn={handleWalkIn}
          onStatusChange={handleStatusChange}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      {showPopover && selectedAppointment && (
        <AppointmentPopover
          appointment={selectedAppointment}
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
          onEdit={handleOpenEdit}
          onStatusChange={(status) =>
            handleStatusChange(selectedAppointment.appointmentId, status)
          }
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        />
      )}

      {showModal && (
        <AppointmentModal
          onClose={() => {
            setShowModal(false);
            setEditingAppointment(null);
            setModalPrefill({});
          }}
          onSave={handleModalSave}
          clinicId={clinicId}
          doctors={doctors}
          appointment={editingAppointment ?? undefined}
          prefill={Object.keys(modalPrefill).length > 0 ? modalPrefill : undefined}
        />
      )}
    </div>
  );
}

function getRangeForView(view: string, date: Date): { start: Date; end: Date } {
  if (view === 'month') {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  // Week starts on Sunday
  const start = startOfDay(startOfWeek(date, { weekStartsOn: 0 }));
  return { start, end: addDays(start, 6) };
}

function roundToNextSlot(date: Date): Date {
  const d = new Date(date);
  if (d.getMinutes() < 30) {
    d.setMinutes(30, 0, 0);
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return d;
}
