'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { clinics } from '@/lib/constants/clinics';

const STAFF_ROLES = ['CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR', 'RECEPTIONIST'];

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface AttendanceRecord {
  recordId: string;
  userId: string;
  userName: string;
  userRole: string;
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

export default function AttendanceBoardPage() {
  const { sessionClaims } = useAuth();
  const isSuperAdmin = (sessionClaims?.role as string) === 'SUPER_ADMIN';
  const [clinicId, setClinicId] = useState<string>(
    (sessionClaims?.primaryClinicId as string) || 'clinic_a'
  );
  const [dateString, setDateString] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    const roleParams = STAFF_ROLES.map((r) => `role=${r}`).join('&');
    const [staffRes, recRes] = await Promise.all([
      fetch(`/api/users?clinicId=${clinicId}&${roleParams}`),
      fetch(`/api/attendance?clinicId=${clinicId}&dateString=${dateString}`),
    ]);
    const staffData = await staffRes.json();
    const recData = await recRes.json();
    setStaff(staffData.users || []);
    const map: Record<string, AttendanceRecord> = {};
    for (const rec of recData.records || []) {
      map[rec.userId] = rec;
    }
    setRecords(map);
    setLoading(false);
  }, [clinicId, dateString]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const roleParams = STAFF_ROLES.map((r) => `role=${r}`).join('&');
        const [staffRes, recRes] = await Promise.all([
          fetch(`/api/users?clinicId=${clinicId}&${roleParams}`),
          fetch(`/api/attendance?clinicId=${clinicId}&dateString=${dateString}`),
        ]);
        const staffData = await staffRes.json();
        const recData = await recRes.json();
        if (cancelled) return;
        setStaff(staffData.users || []);
        const map: Record<string, AttendanceRecord> = {};
        for (const rec of recData.records || []) {
          map[rec.userId] = rec;
        }
        setRecords(map);
      } catch (error) {
        console.error('Error loading attendance board:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, dateString]);

  const handleClock = async (targetUserId: string, action: 'clock-in' | 'clock-out') => {
    setClocking(targetUserId);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, clinicId, targetUserId }),
      });
      if (res.ok) {
        loadBoard();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update attendance');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setClocking(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Attendance Board</h1>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
            >
              {clinics.map((c) => (
                <option key={c.clinicId} value={c.clinicId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={dateString}
            onChange={(e) => setDateString(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-2xl mb-8">
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
          <div>
            <h3 className="font-semibold">Actions</h3>
            <p className="text-sm text-gray-500">
              Clock in/out staff for {dateString}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/hr/leaves"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Leaves
            </Link>
            <Link
              href="/hr/corrections"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Corrections
            </Link>
            <Link
              href="/hr/leaves/review"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Review Leaves
            </Link>
            <Link
              href="/hr/corrections/review"
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Review Corrections
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
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => {
                const rec = records[member.id];
                const clockedIn = !!rec?.clockIn;
                const clockedOut = !!rec?.clockOut;
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rec?.clockIn
                        ? new Date(rec.clockIn).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rec?.clockOut
                        ? new Date(rec.clockOut).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rec?.hoursWorked ? `${rec.hoursWorked}h` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${statusColor(rec?.status || 'ABSENT')}`}
                      >
                        {rec?.status || 'ABSENT'}
                      </span>
                      {rec?.hasCorrectionRequest && (
                        <span className="ml-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Correction
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!clockedIn ? (
                        <button
                          onClick={() => handleClock(member.id, 'clock-in')}
                          disabled={clocking === member.id}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Clock In
                        </button>
                      ) : !clockedOut ? (
                        <button
                          onClick={() => handleClock(member.id, 'clock-out')}
                          disabled={clocking === member.id}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Clock Out
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No staff found
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