'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
  isSameDay,
  isSameMonth,
  startOfDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { AppointmentPopover } from '@/components/calendar/AppointmentPopover';
import { AppointmentModal } from '@/components/calendar/AppointmentModal';

interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  durationMinutes: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  isWalkIn: boolean;
  tokenNumber: string | null;
  abhaId: string | null;
  plannedProcedures: string | null;
  notes: string | null;
}

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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 AM to 7:00 PM

export default function CalendarPage() {
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const isMobile = useMobile();

  useEffect(() => {
    if (!isMobile && view === 'day') {
      const t = setTimeout(() => setView('week'), 0);
      return () => clearTimeout(t);
    }
  }, [isMobile, view]);

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

  const handleAppointmentClick = (appt: Appointment, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverPosition({ x: rect.left, y: rect.top - 100 });
    setSelectedAppointment(appt);
    setShowPopover(true);
  };

  const handleOpenEdit = () => {
    setShowPopover(false);
    setEditingAppointment(selectedAppointment);
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    setEditingAppointment(null);
    setShowModal(true);
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingAppointment(null);
    setRefreshKey((k) => k + 1);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate((d) => addDays(d, direction === 'prev' ? -1 : 1));
    } else if (view === 'week') {
      setCurrentDate((d) => (direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1)));
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow p-4 h-[calc(100vh-160px)] overflow-y-auto">
        <h3 className="font-semibold text-gray-700 mb-4">Doctors</h3>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedDoctor('all')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDoctor === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            All Doctors
          </button>
          {doctors.map((doctor) => (
            <button
              key={doctor.id}
              onClick={() => setSelectedDoctor(doctor.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDoctor === doctor.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              {doctor.name}
            </button>
          ))}
        </div>

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
                  <p className="text-sm font-medium text-gray-800 truncate">{reminder.title}</p>
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
      </div>

      {/* Calendar Area */}
      <div className="flex-1 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => handleNavigate('prev')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy')
                : view === 'week'
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(
                    addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6),
                    'MMM d, yyyy'
                  )}`
                : format(currentDate, 'EEE, MMM d, yyyy')}
            </h2>
            <button onClick={() => handleNavigate('next')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              {(['day', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-sm capitalize ${
                    view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
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
          <MonthView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : view === 'week' ? (
          <WeekView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </div>

      {showPopover && selectedAppointment && (
        <AppointmentPopover
          appointment={selectedAppointment}
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
          onEdit={handleOpenEdit}
          onCollectPayment={() => {
            router.push(
              `/patients/${selectedAppointment.patientId}/billing/invoices/new?appointmentId=${selectedAppointment.appointmentId}`
            );
          }}
        />
      )}

      {showModal && (
        <AppointmentModal
          onClose={() => {
            setShowModal(false);
            setEditingAppointment(null);
          }}
          onSave={handleModalSave}
          clinicId={clinicId}
          doctors={doctors}
          appointment={editingAppointment || undefined}
        />
      )}
    </div>
  );
}

function getRangeForView(view: string, date: Date): { start: Date; end: Date } {
  if (view === 'month') {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  const start = startOfDay(startOfWeek(date, { weekStartsOn: 1 }));
  return { start, end: addDays(start, 6) };
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  CONFIRMED: 'bg-green-500',
  IN_PROGRESS: 'bg-yellow-500',
  COMPLETED: 'bg-green-700',
  CANCELLED: 'bg-red-500',
  NO_SHOW: 'bg-gray-500',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-blue-500';
}

function MonthView({
  currentDate,
  appointments,
  onAppointmentClick,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appt: Appointment, e: React.MouseEvent) => void;
}) {
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="p-2 text-center text-sm font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointments.filter((a) =>
            isSameDay(new Date(a.appointmentDate), day)
          );
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toString()}
              className={`border-b border-r border-gray-200 min-h-[100px] p-1 ${
                !inMonth ? 'bg-gray-50' : ''
              } ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  isSameDay(day, new Date())
                    ? 'text-blue-600'
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
                  onClick={(e) => onAppointmentClick(appt, e)}
                  className={`${statusColor(appt.status)} text-white text-[11px] p-1 rounded mb-1 cursor-pointer truncate`}
                >
                  {format(new Date(appt.appointmentDate), 'HH:mm')} {appt.patientName}
                </div>
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
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

function WeekView({
  currentDate,
  appointments,
  onAppointmentClick,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appt: Appointment, e: React.MouseEvent) => void;
}) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day) => (
          <div
            key={day.toString()}
            className={`p-2 text-center font-medium ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}
          >
            <span className="text-sm text-gray-500">{format(day, 'EEE')}</span>
            <div
              className={`text-lg font-bold ${
                isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-800'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day) => {
          const dayAppointments = getDayAppointments(appointments, day);
          return (
            <div
              key={day.toString()}
              className="border-r border-gray-200 last:border-r-0 p-1 min-h-[100px]"
            >
              {dayAppointments.map((appt) => (
                <div
                  key={appt.appointmentId}
                  onClick={(e) => onAppointmentClick(appt, e)}
                  className={`${statusColor(appt.status)} text-white text-xs p-1 rounded mb-1 cursor-pointer truncate`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {format(new Date(appt.appointmentDate), 'HH:mm')}
                    </span>
                    <span className="truncate ml-1">{appt.patientName}</span>
                  </div>
                </div>
              ))}
              {dayAppointments.length === 0 && (
                <div className="text-xs text-gray-300 text-center mt-2">No appointments</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  appointments,
  onAppointmentClick,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appt: Appointment, e: React.MouseEvent) => void;
}) {
  const dayAppointments = getDayAppointments(appointments, currentDate);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 border-b border-gray-200">
        <div className="col-span-2 p-2 text-center font-medium bg-gray-50">Time</div>
        <div
          className={`col-span-10 p-2 text-center font-medium ${
            isSameDay(currentDate, new Date()) ? 'bg-blue-50' : ''
          }`}
        >
          {format(currentDate, 'EEEE, MMM d, yyyy')}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-2">
          {HOURS.map((hour) => (
            <div key={hour} className="h-16 border-b border-gray-100 p-1 text-xs text-gray-500">
              {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
            </div>
          ))}
        </div>
        <div className="col-span-10 border-l border-gray-200 relative min-h-[768px]">
          {HOURS.map((hour) => (
            <div key={hour} className="h-16 border-b border-gray-100" />
          ))}
          {dayAppointments.map((appt) => {
            const date = new Date(appt.appointmentDate);
            const hourIndex = date.getHours() - 8;
            const top = hourIndex * 64 + (date.getMinutes() / 60) * 64;
            const height = Math.max((appt.durationMinutes / 60) * 64, 24);
            return (
              <div
                key={appt.appointmentId}
                onClick={(e) => onAppointmentClick(appt, e)}
                className={`${statusColor(appt.status)} text-white text-xs p-1 rounded cursor-pointer absolute left-1 right-1 overflow-hidden`}
                style={{ top, height }}
              >
                <span className="font-medium block">
                  {format(date, 'HH:mm')} - {appt.patientName}
                </span>
                <span className="text-[10px] opacity-90">Dr. {appt.doctorName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getDayAppointments(appointments: Appointment[], day: Date): Appointment[] {
  return appointments
    .filter((a) => isSameDay(new Date(a.appointmentDate), day))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
}