'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

interface Correction {
  correctionId: string;
  attendanceRecordId: string;
  dateString: string;
  requestType: string;
  status: string;
  reason: string;
}

export default function CorrectionsPage() {
  const { userId, sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    dateString: '',
    requestType: 'MISSED_CLOCK_IN',
    requestedClockIn: '',
    requestedClockOut: '',
    reason: '',
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const corRes = await fetch(
          `/api/attendance-corrections?clinicId=${clinicId}&mine=true`
        );
        const corData = await corRes.json();
        if (cancelled) return;
        setCorrections(corData.corrections || []);
      } catch (error) {
        console.error('Error loading corrections:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, clinicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateString || !form.reason) {
      alert('Select a date and provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      const attendanceRecordId = `${userId}_${clinicId}_${form.dateString}`;
      const res = await fetch('/api/attendance-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clinicId,
          userId,
          attendanceRecordId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Correction request submitted');
        setForm({
          dateString: '',
          requestType: 'MISSED_CLOCK_IN',
          requestedClockIn: '',
          requestedClockOut: '',
          reason: '',
        });
        const reload = await fetch(
          `/api/attendance-corrections?clinicId=${clinicId}&mine=true`
        );
        const reloadData = await reload.json();
        setCorrections(reloadData.corrections || []);
      } else {
        alert(data.error || 'Failed to submit correction');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Attendance Corrections</h1>
        <Link
          href="/hr/corrections/review"
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Review Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4 h-fit">
          <h3 className="font-semibold">Request a Correction</h3>
          <div>
            <label className="block text-sm font-medium">Date *</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              value={form.dateString}
              onChange={(e) => setForm({ ...form, dateString: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Request Type *</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value })}
            >
              <option value="MISSED_CLOCK_IN">Missed Clock In</option>
              <option value="MISSED_CLOCK_OUT">Missed Clock Out</option>
              <option value="WRONG_TIME">Wrong Time</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Requested Clock In</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={form.requestedClockIn}
                onChange={(e) =>
                  setForm({ ...form, requestedClockIn: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Requested Clock Out</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={form.requestedClockOut}
                onChange={(e) =>
                  setForm({ ...form, requestedClockOut: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Reason *</label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">My Requests</h3>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {corrections.map((cor) => (
                  <tr key={cor.correctionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{cor.dateString}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cor.requestType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          cor.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : cor.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cor.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {corrections.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      No correction requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}