'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader } from 'lucide-react';

interface Stage {
  stageId: string;
  stageName: string;
  description: string;
  deadline: string | null;
  status: string;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
}

interface LabOrder {
  orderId: string;
  labName: string;
  patientName: string;
  orderedByDoctorName: string;
  workDescription: string;
  status: string;
  stages: Stage[];
}

export default function LabPortalOrderDetailPage() {
  const { sessionClaims } = useAuth();
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingStageId, setCompletingStageId] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [stageCosts, setStageCosts] = useState<Record<string, string>>({});

  const role = (sessionClaims?.role as string) || '';
  const isLabTech = role === 'LAB_TECHNICIAN';

  useEffect(() => {
    if (!isLabTech) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/lab-orders/${params.orderId}`);
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch (error) {
        console.error('Error fetching lab order:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.orderId, isLabTech]);

  const handleCompleteStage = async (stage: Stage) => {
    const confirmed = confirm(
      `Mark stage "${stage.stageName}" as COMPLETED?`
    );
    if (!confirmed) return;

    setCompletingStageId(stage.stageId);
    try {
      const res = await fetch(
        `/api/lab-orders/${params.orderId}/complete-stage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: stage.stageId,
            stageCost: stageCosts[stage.stageId]
              ? Number(stageCosts[stage.stageId] || 0)
              : undefined,
            notes: stageNotes[stage.stageId] || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: data.orderStatus || prev.status,
                stages: prev.stages.map((s) =>
                  s.stageId === stage.stageId
                    ? {
                        ...s,
                        status: 'COMPLETED',
                        completedAt: new Date().toISOString(),
                        completedByName: 'You',
                      }
                    : s
                ),
              }
            : prev
        );
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to complete stage');
      }
    } catch (error) {
      console.error('Error completing stage:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setCompletingStageId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Lab order not found</p>
        <button
          onClick={() => router.push('/portal/lab/orders')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Lab Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push('/portal/lab/orders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{order.orderId}</h1>
            <p className="text-gray-500 text-sm mt-1">Lab: {order.labName}</p>
          </div>
          <span
            className={`px-3 py-1 text-xs rounded-full text-white ${
              order.status === 'COMPLETED'
                ? 'bg-green-500'
                : order.status === 'CANCELLED'
                ? 'bg-red-500'
                : order.status === 'IN_PROGRESS'
                ? 'bg-blue-500'
                : 'bg-yellow-500'
            }`}
          >
            {order.status}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Patient</dt>
            <dd className="font-medium">{order.patientName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Ordering Doctor</dt>
            <dd className="font-medium">{order.orderedByDoctorName}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500">Work Description</h3>
          <p className="mt-1">{order.workDescription}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Stages</h2>
        <div className="space-y-4">
          {order.stages.map((stage) => {
            const completed = stage.status === 'COMPLETED';
            return (
              <div key={stage.stageId} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Loader className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full text-white ${
                      completed ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="font-medium">{stage.stageName}</p>
                  {stage.description && (
                    <p className="mt-1 text-sm text-gray-600">{stage.description}</p>
                  )}
                  {stage.deadline && (
                    <p className="mt-1 text-xs text-gray-500">Deadline: {stage.deadline}</p>
                  )}
                </div>

                {completed ? (
                  <p className="mt-3 text-xs text-gray-500">
                    Completed by {stage.completedByName || 'Lab Technician'} on{' '}
                    {stage.completedAt
                      ? new Date(stage.completedAt).toLocaleString()
                      : 'N/A'}
                  </p>
                ) : (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                    <input
                      type="number"
                      placeholder="Stage cost (₹)"
                      value={stageCosts[stage.stageId] || ''}
                      onChange={(e) =>
                        setStageCosts({ ...stageCosts, [stage.stageId]: e.target.value })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={stageNotes[stage.stageId] || ''}
                      onChange={(e) =>
                        setStageNotes({ ...stageNotes, [stage.stageId]: e.target.value })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleCompleteStage(stage)}
                      disabled={completingStageId === stage.stageId}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {completingStageId === stage.stageId
                        ? 'Marking...'
                        : 'Mark Stage Complete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}