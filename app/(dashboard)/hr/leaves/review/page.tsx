'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

interface Leave {
  leaveId: string;
  userName: string;
  userRole: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  reason: string | null;
  status: string;
  appliedAt: string;
}

interface ReviewPayload {
  action: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

export default function LeaveReviewPage() {
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/leaves?clinicId=${clinicId}&status=PENDING`
        );
        const data = await res.json();
        if (!cancelled) setLeaves(data.leaves || []);
      } catch (error) {
        console.error('Error loading leave requests:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, clinicId]);

  const handleReview = async (leave: Leave, action: ReviewPayload['action']) => {
    setReviewingId(leave.leaveId);
    try {
      const res = await fetch(`/api/leaves/${leave.leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotes[leave.leaveId] || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeaves((prev) => prev.filter((l) => l.leaveId !== leave.leaveId));
      } else {
        alert(data.error || 'Failed to review leave');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setReviewingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        You do not have permission to review leaves.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        <Link
          href="/hr/leaves"
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to My Leaves
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No pending leave requests
        </div>
      ) : (
        <div className="space-y-4">
          {leaves.map((leave) => (
            <div key={leave.leaveId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{leave.userName}</p>
                  <p className="text-sm text-gray-500">
                    {leave.userRole} · {leave.leaveId}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                  PENDING
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type: </span>
                  <span className="font-medium">
                    {leave.leaveType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Days: </span>
                  <span className="font-medium">{leave.totalDays}</span>
                </div>
                <div>
                  <span className="text-gray-500">From: </span>
                  <span className="font-medium">
                    {new Date(leave.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">To: </span>
                  <span className="font-medium">
                    {new Date(leave.endDate).toLocaleDateString()}
                  </span>
                </div>
                {leave.reason && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Reason: </span>
                    <span>{leave.reason}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4 flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Review notes (optional)"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={reviewNotes[leave.leaveId] || ''}
                  onChange={(e) =>
                    setReviewNotes({ ...reviewNotes, [leave.leaveId]: e.target.value })
                  }
                />
                <button
                  onClick={() => handleReview(leave, 'APPROVED')}
                  disabled={reviewingId === leave.leaveId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(leave, 'REJECTED')}
                  disabled={reviewingId === leave.leaveId}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}