'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
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
        const todayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
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
        const reload = await fetch(
          `/api/attendance?clinicId=${clinicId}&userId=${userId}`
        );
        const reloadData = await reload.json();
        const list: AttendanceRecord[] = reloadData.records || [];
        setRecords(list);
        const todayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        setToday(list.find((r) => r.dateString === todayStr) || null);
      } else {
        alert(data.error || 'Failed to update attendance');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setAction(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Attendance</h1>

      {isAssistant && <SundayTaskPanel />}

      <div className="max-w-2xl mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-1">Today</h3>
          <p className="text-sm text-gray-500 mb-4">
            {today
              ? `${today.dateString} — ${today.status}`
              : 'No mark for today yet'}
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
              Clocked in at{' '}
              {new Date(today.clockIn).toLocaleTimeString()}
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((rec) => (
                <tr key={rec.recordId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rec.dateString}
                  </td>
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
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${statusColor(rec.status)}`}
                    >
                      {rec.status}
                    </span>
                    {rec.hasCorrectionRequest && (
                      <span className="ml-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Correction pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No attendance records yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}