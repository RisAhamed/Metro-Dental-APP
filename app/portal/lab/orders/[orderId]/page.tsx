'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  Loader,
  AlertTriangle,
  AlertOctagon,
  Undo2,
  AlertCircle,
} from 'lucide-react';

interface Stage {
  stageId: string;
  stageName: string;
  description: string;
  deadline: string | null;
  status: string;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
  price: string | null;
}

interface Issue {
  issueId: string;
  issueType: 'DEFECTIVE' | 'RETURNED' | 'ERROR' | 'OTHER';
  message: string;
  status: 'OPEN' | 'RESOLVED';
  reportedByName: string;
  reportedAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

interface Billing {
  totalCost: string | number | null;
  amountPaid: string | number | null;
  paymentStatus: string;
  stageCosts: Array<{ stageName: string; cost: number | string | null }>;
}

interface LabOrder {
  orderId: string;
  labName: string;
  clinicId: string;
  patientName: string;
  orderedByDoctorName: string;
  workDescription: string;
  workType: string | null;
  shade: string | null;
  totalAmount: string | null;
  status: string;
  stages: Stage[];
  issues: Issue[];
}

const ISSUE_ICONS: Record<string, typeof AlertTriangle> = {
  DEFECTIVE: AlertTriangle,
  RETURNED: Undo2,
  ERROR: AlertOctagon,
  OTHER: AlertCircle,
};

const ISSUE_LABELS: Record<string, string> = {
  DEFECTIVE: 'Defective',
  RETURNED: 'Returned',
  ERROR: 'Error',
  OTHER: 'Other',
};

export default function LabPortalOrderDetailPage() {
  const { sessionClaims } = useAuth();
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingStageId, setCompletingStageId] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [stageCosts, setStageCosts] = useState<Record<string, string>>({});
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const role = (sessionClaims?.role as string) || '';
  const isLabTech = role === 'LAB_TECHNICIAN';

  useEffect(() => {
    if (!isLabTech) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [orderRes, billingRes] = await Promise.all([
          fetch(`/api/lab-orders/${params.orderId}`),
          fetch(`/api/lab-orders/${params.orderId}/billing`),
        ]);
        const orderData = await orderRes.json();
        const billingData = await billingRes.json();
        if (!cancelled) {
          setOrder(orderData.order);
          setBilling(billingRes.ok ? billingData.billing : null);
        }
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

  const handleResolveIssue = async (issueId: string) => {
    const confirmed = confirm('Mark this issue as resolved?');
    if (!confirmed) return;

    setResolvingIssueId(issueId);
    try {
      const res = await fetch(
        `/api/lab-orders/${params.orderId}/issues/${issueId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolutionNote: resolutionNotes[issueId] || undefined,
          }),
        }
      );

      if (res.ok) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                issues: prev.issues.map((i) =>
                  i.issueId === issueId
                    ? {
                        ...i,
                        status: 'RESOLVED',
                        resolvedByName: 'You',
                        resolvedAt: new Date().toISOString(),
                        resolutionNote: resolutionNotes[issueId] || null,
                      }
                    : i
                ),
              }
            : prev
        );
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to resolve issue');
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setResolvingIssueId(null);
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

  const openIssues = (order.issues || []).filter((i) => i.status === 'OPEN');
  const nextStages = order.stages.filter((s) => s.status !== 'COMPLETED');

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push('/portal/lab/orders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      {/* Order header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{order.orderId}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Lab: {order.labName} •{' '}
              {order.clinicId === 'clinic_a' ? 'Clinic A' : 'Clinic B'}
            </p>
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
          <div>
            <dt className="text-sm text-gray-500">Work Type</dt>
            <dd className="font-medium">{order.workType || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Shade</dt>
            <dd className="font-medium">{order.shade || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Total Amount</dt>
            <dd className="font-medium">
              {order.totalAmount ? `₹${Number(order.totalAmount).toLocaleString('en-IN')}` : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500">Work Description</h3>
          <p className="mt-1">{order.workDescription}</p>
        </div>
      </div>

      {/* Issues panel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold">
            Issues & Feedback ({openIssues.length} open)
          </h2>
        </div>

        {order.issues.length === 0 ? (
          <p className="text-sm text-gray-500">No issues reported by doctors.</p>
        ) : (
          <div className="space-y-3">
            {order.issues.map((issue) => {
              const Icon = ISSUE_ICONS[issue.issueType] || AlertTriangle;
              const resolved = issue.status === 'RESOLVED';
              return (
                <div
                  key={issue.issueId}
                  className={`border rounded-md p-4 ${
                    resolved ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon
                        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          resolved ? 'text-gray-400' : 'text-red-600'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              resolved
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {ISSUE_LABELS[issue.issueType] || issue.issueType}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              resolved
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mt-2">{issue.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reported by {issue.reportedByName} on{' '}
                          {new Date(issue.reportedAt).toLocaleString()}
                        </p>
                        {resolved && issue.resolvedByName && (
                          <p className="text-xs text-green-600 mt-1">
                            Resolved by {issue.resolvedByName}
                            {issue.resolvedAt
                              ? ` on ${new Date(issue.resolvedAt).toLocaleString()}`
                              : ''}
                            {issue.resolutionNote ? ` — ${issue.resolutionNote}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!resolved && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Resolution note (optional)"
                        value={resolutionNotes[issue.issueId] || ''}
                        onChange={(e) =>
                          setResolutionNotes({
                            ...resolutionNotes,
                            [issue.issueId]: e.target.value,
                          })
                        }
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleResolveIssue(issue.issueId)}
                        disabled={resolvingIssueId === issue.issueId}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {resolvingIssueId === issue.issueId ? 'Resolving...' : 'Mark Resolved'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next stages */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">
          Stages to Complete ({nextStages.length} remaining)
        </h2>
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

      {/* Billing summary */}
      {billing && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing</h2>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Total Cost</dt>
              <dd className="font-semibold">₹{Number(billing.totalCost || 0).toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Paid</dt>
              <dd className="font-semibold text-green-600">
                ₹{Number(billing.amountPaid || 0).toLocaleString('en-IN')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Payment Status</dt>
              <dd className="font-semibold">{billing.paymentStatus}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
