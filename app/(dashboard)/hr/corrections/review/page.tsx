'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

interface Correction {
  correctionId: string;
  attendanceRecordId: string;
  requestedByName: string;
  requesterRole: string;
  dateString: string;
  requestType: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  reason: string;
  status: string;
}

interface ReviewPayload {
  action: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

export default function CorrectionReviewPage() {
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';

  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance-corrections?clinicId=${clinicId}`);
        const data = await res.json();
        if (!cancelled) {
          setCorrections(
            (data.corrections || []).filter((c: Correction) => c.status === 'PENDING')
          );
        }
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
  }, [isAdmin, clinicId]);

  const handleReview = async (
    correction: Correction,
    action: ReviewPayload['action']
  ) => {
    setReviewingId(correction.correctionId);
    try {
      const res = await fetch('/api/attendance-corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctionId: correction.correctionId,
          action,
          reviewNotes: reviewNotes[correction.correctionId] || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCorrections((prev) =>
          prev.filter((c) => c.correctionId !== correction.correctionId)
        );
      } else {
        alert(data.error || 'Failed to review correction');
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
        You do not have permission to review corrections.
      </div>
    );
  }

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Correction Requests</h1>
        <Link
          href="/hr/corrections"
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to My Corrections
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : corrections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No pending correction requests
        </div>
      ) : (
        <div className="space-y-4">
          {corrections.map((cor) => (
            <div key={cor.correctionId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{cor.requestedByName}</p>
                  <p className="text-sm text-gray-500">
                    {cor.requesterRole} · {cor.correctionId} · {cor.dateString}
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
                    {cor.requestType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Original: </span>
                  <span className="font-medium">
                    {formatTime(cor.originalClockIn)} → {formatTime(cor.originalClockOut)}
                  </span>
                </div>
                {(cor.requestedClockIn || cor.requestedClockOut) && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Requested: </span>
                    <span className="font-medium">
                      {formatTime(cor.requestedClockIn)} →{' '}
                      {formatTime(cor.requestedClockOut)}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500">Reason: </span>
                  <span>{cor.reason}</span>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4 flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Review notes (optional)"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={reviewNotes[cor.correctionId] || ''}
                  onChange={(e) =>
                    setReviewNotes({ ...reviewNotes, [cor.correctionId]: e.target.value })
                  }
                />
                <button
                  onClick={() => handleReview(cor, 'APPROVED')}
                  disabled={reviewingId === cor.correctionId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(cor, 'REJECTED')}
                  disabled={reviewingId === cor.correctionId}
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