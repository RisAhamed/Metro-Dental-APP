'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { toISTDateString } from '@/lib/utils/attendance';
import { SundayTaskPanel } from '@/components/hr/SundayTaskPanel';

interface AttendanceRecord {
  recordId: string;
  dateString: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: string | null;
  status: string;
  hasCorrectionRequest: boolean;
}

const STATUS_DOT: Record<string, string> = {
  PRESENT: 'bg-green-500',
  ABSENT: 'bg-red-500',
  HALF_DAY: 'bg-yellow-500',
  ON_LEAVE: 'bg-blue-500',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  HALF_DAY: 'bg-yellow-100 text-yellow-800',
  ON_LEAVE: 'bg-blue-100 text-blue-800',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

export default function MyAttendancePage() {
  const { userId, sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const role = (sessionClaims?.role as string) || '';
  const isAssistant = role === 'ASSISTANT_DOCTOR';
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'clock-in' | 'clock-out' | null>(null);
  const [today, setToday] = useState<AttendanceRecord | null>(null);

  const [monthOffset, setMonthOffset] = useState(0);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [corrForm, setCorrForm] = useState({
    requestType: 'MISSED_CLOCK_IN',
    clockIn: '',
    clockOut: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance?clinicId=${clinicId}&userId=${userId}`);
        const data = await res.json();
        if (cancelled) return;
        const list: AttendanceRecord[] = data.records || [];
        setRecords(list);
        const todayStr = toISTDateString(new Date());
        setToday(list.find((r) => r.dateString === todayStr) || null);
      } catch (error) {
        console.error('Error loading my attendance:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, clinicId]);

  const handleClock = async (act: 'clock-in' | 'clock-out') => {
    setAction(act);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act, clinicId }),
      });
      const data = await res.json();
      if (res.ok) {
        const reload = await fetch(`/api/attendance?clinicId=${clinicId}&userId=${userId}`);
        const reloadData = await reload.json();
        const list: AttendanceRecord[] = reloadData.records || [];
        setRecords(list);
        const todayStr = toISTDateString(new Date());
        setToday(list.find((r) => r.dateString === todayStr) || null);
      } else {
        alert(data.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Clock error:', error);
      alert('An error occurred');
    } finally {
      setAction(null);
    }
  };

  // Build calendar data for the selected month
  const { gridDays, monthLabel } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const first = new Date(year, month, 1);
    const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateString: string; day: number; rec?: AttendanceRecord }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateString: '', day: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d, 12, 0, 0);
      const ds = toISTDateString(dt);
      cells.push({ dateString: ds, day: d, rec: records.find((r) => r.dateString === ds) });
    }
    return { gridDays: cells, monthLabel: label };
  }, [records, monthOffset]);

  const monthlyRecords = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return records
      .filter((r) => r.dateString.startsWith(prefix))
      .sort((a, b) => b.dateString.localeCompare(a.dateString));
  }, [records, monthOffset]);

  const summary = useMemo(() => {
    const presentDays = monthlyRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'HALF_DAY'
    ).length;
    const totalHours = monthlyRecords.reduce(
      (sum, r) => sum + (r.status !== 'ON_LEAVE' ? Number(r.hoursWorked || 0) : 0),
      0
    );
    return {
      presentDays,
      totalHours,
      avg: presentDays > 0 ? totalHours / presentDays : 0,
    };
  }, [monthlyRecords]);

  const openEdit = (rec: AttendanceRecord) => {
    setEditing(rec);
    setCorrForm({
      requestType: 'MISSED_CLOCK_IN',
      clockIn: rec.clockIn ? rec.clockIn.slice(0, 16) : '',
      clockOut: rec.clockOut ? rec.clockOut.slice(0, 16) : '',
      reason: '',
    });
  };

  const submitCorrection = async () => {
    if (!editing || !corrForm.reason.trim()) {
      alert('Please provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      const attendanceRecordId = `${userId}_${clinicId}_${editing.dateString}`;
      const res = await fetch('/api/attendance-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceRecordId,
          clinicId,
          dateString: editing.dateString,
          requestType: corrForm.requestType,
          requestedClockIn: corrForm.clockIn || null,
          requestedClockOut: corrForm.clockOut || null,
          reason: corrForm.reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Correction request submitted');
        setEditing(null);
      } else {
        alert(data.error || 'Failed to submit correction');
      }
    } catch (error) {
      console.error('Correction error:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Attendance</h1>

      {isAssistant && <SundayTaskPanel />}

      <div className="max-w-2xl mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-1">Today</h3>
          <p className="text-sm text-gray-500 mb-4">
            {today ? `${today.dateString} — ${today.status}` : 'No mark for today yet'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleClock('clock-in')}
              disabled={action !== null || !!today?.clockIn}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Clock In
            </button>
            <button
              onClick={() => handleClock('clock-out')}
              disabled={action !== null || !today?.clockIn || !!today?.clockOut}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Clock Out
            </button>
          </div>
          {today?.clockIn && (
            <p className="mt-3 text-sm text-gray-600">
              Clocked in at {new Date(today.clockIn).toLocaleTimeString()}
              {today.clockOut
                ? `, out at ${new Date(today.clockOut).toLocaleTimeString()}`
                : ''}
              {today.hoursWorked ? ` — ${today.hoursWorked}h` : ''}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Link
              href="/hr/leaves"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Apply Leave
            </Link>
            <Link
              href="/hr/corrections"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Request Correction
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Monthly Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium w-40 text-center">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="p-1 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((cell, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-sm border ${
                  cell.rec
                    ? 'border-gray-200'
                    : cell.day
                    ? 'border-gray-100'
                    : 'border-transparent'
                }`}
              >
                {cell.day > 0 && (
                  <div className="relative flex flex-col items-center">
                    <span className="text-gray-700">{cell.day}</span>
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${
                        cell.rec ? STATUS_DOT[cell.rec.status] || 'bg-gray-300' : 'bg-transparent'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> Half Day
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> On Leave
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">Summary — {monthLabel}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Days Worked</p>
              <p className="text-2xl font-bold">{summary.presentDays}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hours Worked</p>
              <p className="text-2xl font-bold">{summary.totalHours.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg / Day</p>
              <p className="text-2xl font-bold">{summary.avg.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">Daily Breakdown — {monthLabel}</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyRecords.map((rec) => (
                <tr key={rec.recordId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.dateString}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rec.hoursWorked ? `${rec.hoursWorked}h` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor(rec.status)}`}>
                      {rec.status}
                    </span>
                    {rec.hasCorrectionRequest && (
                      <span className="ml-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Correction pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(rec)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Request correction"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {monthlyRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No attendance records for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Correction modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Request Attendance Correction</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{editing.dateString}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-500">Current Clock In</p>
                  <p className="font-medium">
                    {editing.clockIn ? new Date(editing.clockIn).toLocaleTimeString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Current Clock Out</p>
                  <p className="font-medium">
                    {editing.clockOut ? new Date(editing.clockOut).toLocaleTimeString() : '—'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                <select
                  value={corrForm.requestType}
                  onChange={(e) => setCorrForm({ ...corrForm, requestType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="MISSED_CLOCK_IN">Missed Clock In</option>
                  <option value="MISSED_CLOCK_OUT">Missed Clock Out</option>
                  <option value="WRONG_TIME">Wrong Time</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corrected Clock In
                  </label>
                  <input
                    type="datetime-local"
                    value={corrForm.clockIn}
                    onChange={(e) => setCorrForm({ ...corrForm, clockIn: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corrected Clock Out
                  </label>
                  <input
                    type="datetime-local"
                    value={corrForm.clockOut}
                    onChange={(e) => setCorrForm({ ...corrForm, clockOut: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  rows={3}
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCorrection}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
