'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

interface Leave {
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  halfDaySlot: string | null;
  reason: string | null;
  status: string;
  appliedAt: string;
  reviewNotes: string | null;
  reviewedByName: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

const LEAVE_TYPES = ['FULL_DAY', 'HALF_DAY', 'EMERGENCY', 'SICK', 'PERMISSION'];

export default function MyLeavesPage() {
  const { sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'FULL_DAY',
    startDate: '',
    endDate: '',
    halfDaySlot: 'MORNING',
    reason: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaves?clinicId=${clinicId}&mine=true`);
        const data = await res.json();
        if (!cancelled) setLeaves(data.leaves || []);
      } catch (error) {
        console.error('Error loading leaves:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      alert('Select start and end dates');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinicId }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm({
          leaveType: 'FULL_DAY',
          startDate: '',
          endDate: '',
          halfDaySlot: 'MORNING',
          reason: '',
        });
        const reload = await fetch(`/api/leaves?clinicId=${clinicId}&mine=true`);
        const reloadData = await reload.json();
        setLeaves(reloadData.leaves || []);
      } else {
        alert(data.error || 'Failed to apply for leave');
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
        <h1 className="text-2xl font-bold">My Leaves</h1>
        <Link
          href="/hr/leaves/review"
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Review Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4 h-fit">
          <h3 className="font-semibold">Apply for Leave</h3>
          <div>
            <label className="block text-sm font-medium">Leave Type *</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Start Date *</label>
              <input
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">End Date *</label>
              <input
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          {form.leaveType === 'HALF_DAY' && (
            <div>
              <label className="block text-sm font-medium">Slot</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={form.halfDaySlot}
                onChange={(e) => setForm({ ...form, halfDaySlot: e.target.value })}
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Reason</label>
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
            {submitting ? 'Applying...' : 'Apply Leave'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">Leave History</h3>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.leaveId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {leave.leaveType.replace(/_/g, ' ')}
                      {leave.halfDaySlot ? ` (${leave.halfDaySlot.toLowerCase()})` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(leave.startDate).toLocaleDateString()} →{' '}
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{leave.totalDays}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {leave.reviewNotes
                        ? leave.reviewNotes
                        : leave.status === 'PENDING'
                        ? '—'
                        : '—'}
                      {leave.reviewedByName && (
                        <span className="block text-xs text-gray-400">
                          by {leave.reviewedByName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${statusColor(leave.status)}`}
                      >
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      No leaves applied yet
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