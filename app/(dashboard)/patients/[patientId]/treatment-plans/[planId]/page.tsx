'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, CheckCircle2 } from 'lucide-react';

interface PlanProcedure {
  procedureId: string;
  procedureName: string;
  qty: number;
  unitCost: number;
  discount: number;
  total: number;
  toothNumbers: number[] | null;
  isFullMouth: boolean;
  isMultiplyCost: boolean;
  notes: string | null;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: string | null;
  completedByName?: string | null;
  amountPaid?: number;
}

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  procedures: PlanProcedure[];
  totalCost: string;
  totalDiscount: string;
  grandTotal: string;
  notes: string | null;
  createdAt: string;
}

const PROC_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

function ProcStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${map[status] || map.PENDING}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function TreatmentPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updatingIdx, setUpdatingIdx] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTargets, setPaymentTargets] = useState<Set<number>>(new Set());
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [completePromptIdx, setCompletePromptIdx] = useState<number | null>(null);
  const [completeAmount, setCompleteAmount] = useState('');

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId || '';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/treatment-plans/${planId}`);
        const data = await res.json();
        if (res.ok) setPlan(data.plan);
        else setNotFound(true);
      } catch (error) {
        console.error('Error loading treatment plan:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (planId) load();
  }, [planId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (res.ok && data.user?.name) setUserName(data.user.name);
      } catch {
        // Status will be recorded without a name
      }
    };
    load();
  }, []);

  const handleConfirmComplete = async () => {
    if (completePromptIdx === null || !plan) return;
    const idx = completePromptIdx;
    const amount = Number(completeAmount);
    if (!amount || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }
    const procTotal = Number(plan.procedures[idx].total || 0);
    if (amount > procTotal) {
      alert(`Amount cannot exceed procedure total ₹${procTotal.toLocaleString('en-IN')}`);
      return;
    }
    setUpdatingIdx(idx);
    try {
      // Step 1: mark status COMPLETED
      const withStatus = plan.procedures.map((p, i) =>
        i === idx
          ? {
              ...p,
              status: 'COMPLETED' as const,
              completedAt: new Date().toISOString(),
              completedByName: userName || undefined,
            }
          : p
      );
      const statusRes = await fetch(`/api/treatment-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedures: withStatus }),
      });
      const statusData = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusData.error || 'Failed to update status');

      // Step 2: record payment for this procedure
      const payRes = await fetch(`/api/treatment-plans/${planId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, procedureIndices: [idx] }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || 'Failed to record payment');

      setPlan(payData.plan);
      setCompletePromptIdx(null);
      setCompleteAmount('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete procedure');
    } finally {
      setUpdatingIdx(null);
    }
  };

  const updateProcedureStatus = async (idx: number, status: (typeof PROC_STATUSES)[number]) => {
    if (!plan) return;
    setUpdatingIdx(idx);
    try {
      const procedures = plan.procedures.map((p, i) => {
        if (i !== idx) return p;
        const next: PlanProcedure = {
          ...p,
          status,
          completedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
          completedByName: status === 'COMPLETED' ? userName || undefined : null,
          amountPaid: status === 'COMPLETED' ? p.total : status === 'PENDING' ? 0 : p.amountPaid ?? 0,
        };
        return next;
      });

      const res = await fetch(`/api/treatment-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedures }),
      });
      const data = await res.json();
      if (res.ok) setPlan(data.plan);
      else alert(data.error || 'Failed to update procedure status');
    } catch {
      alert('An error occurred while updating the procedure');
    } finally {
      setUpdatingIdx(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (notFound || !plan) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Treatment plan not found</p>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  const statusColor =
    plan.status === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : plan.status === 'COMPLETED'
        ? 'bg-blue-100 text-blue-700'
        : plan.status === 'PAUSED'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-gray-100 text-gray-600';

  const completedCount = plan.procedures.filter((p) => p.status === 'COMPLETED').length;
  const totalPaid = plan.procedures.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const computedGrandTotal = Number(plan.grandTotal || 0);
  const balanceDue = Math.max(computedGrandTotal - totalPaid, 0);
  const paymentStatus =
    totalPaid >= computedGrandTotal && computedGrandTotal > 0
      ? 'PAID'
      : totalPaid > 0
        ? 'PARTIALLY_PAID'
        : 'UNPAID';

  const allSelected = plan.procedures.length > 0 && selected.size === plan.procedures.length;
  const selectedCountText = `${selected.size} of ${plan.procedures.length} selected`;

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(plan.procedures.map((_, i) => i)));
  };

  const handleGenerateInvoiceSelected = async () => {
    if (selected.size === 0) {
      alert('Select at least one procedure to generate an invoice.');
      return;
    }
    setGeneratingInvoice(true);
    try {
      const selectedIndices = Array.from(selected);
      const res = await fetch(`/api/treatment-plans/${planId}/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, selectedIndices }),
      });
      const data = await res.json();
      if (res.ok) {
        // Navigate to invoice detail or show success
        if (data.invoiceId) {
          router.push(`/invoices/${data.invoiceId}`);
        } else {
          alert('Invoice generated: ' + (data.invoiceNumber || 'Success'));
        }
      } else {
        alert(data.error || 'Failed to generate invoice');
      }
    } catch {
      alert('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-4">
      {/* Print header - visible only on print */}
      <div className="hidden print:block bg-white border-b border-gray-300 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Metro Dental Clinic</h1>
        <p className="text-sm text-gray-600">Treatment Plan Estimate / Quotation</p>
        <p className="text-xs text-gray-500 mt-2">Patient ID: {patientId} • Date: {new Date().toLocaleDateString('en-IN')}</p>
      </div>
      <div className="print:hidden">
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.title || 'Untitled Plan'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{plan.planId}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor}`}>{plan.status}</span>
              <span className="text-sm text-gray-500">
                Created {new Date(plan.createdAt).toLocaleDateString()}
              </span>
              {plan.procedures.length > 0 && (
                <span className="text-sm text-gray-500">
                  • {completedCount}/{plan.procedures.length} completed
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
            >
              Print
            </button>
            <button
              onClick={() => router.push(`/patients/${patientId}/billing/invoices/new?planId=${planId}`)}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              Generate Invoice
            </button>
            {(plan.status === 'DRAFT' || plan.status === 'ACTIVE' || plan.status === 'PAUSED') && (
              <button
                onClick={() => router.push(`/patients/${patientId}/treatment-plans/${planId}/edit`)}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" /> Edit Plan
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Procedures</h2>
              <p className="text-xs text-gray-400">
                Mark each procedure as In Progress or Completed as treatment advances. Completed
                procedures appear in the patient&apos;s Completed Procedures section.
              </p>
            </div>
            {plan.procedures.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleGenerateInvoiceSelected}
                  disabled={selected.size === 0 || generatingInvoice}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingInvoice ? 'Generating...' : `Generate Invoice for Selected`}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                >
                  Print All
                </button>
              </div>
            )}
          </div>
          {plan.procedures.length > 0 && (
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Select All <span className="font-normal text-gray-500">({selectedCountText})</span>
            </label>
          )}
        </div>
        {plan.procedures.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-500">No procedures in this plan.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QTY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teeth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plan.procedures.map((proc, idx) => (
                <tr key={`${proc.procedureId}-${idx}`} className={`${proc.status === 'COMPLETED' ? 'bg-green-50/40' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(idx)}
                      onChange={() => toggleSelect(idx)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {proc.status === 'COMPLETED' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {proc.procedureName}
                    </p>
                    {proc.notes && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap max-w-md">{proc.notes}</p>}
                    {proc.status === 'COMPLETED' && proc.completedAt && (
                      <p className="text-[11px] text-green-700 mt-0.5">
                        Completed{proc.completedByName ? ` by Dr. ${proc.completedByName}` : ''} on{' '}
                        {new Date(proc.completedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{proc.qty}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">₹{proc.unitCost.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-sm text-red-600">₹{proc.discount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                    ₹{proc.total.toLocaleString('en-IN')}
                    {Number(proc.amountPaid || 0) > 0 && (
                      <p className="text-xs font-normal text-green-600">Paid ₹{Number(proc.amountPaid).toLocaleString('en-IN')}</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {proc.isFullMouth ? (
                      <span className="text-xs text-gray-500">Full Mouth</span>
                    ) : proc.toothNumbers && proc.toothNumbers.length > 0 ? (
                      <span className="text-xs text-gray-500">
                        {proc.toothNumbers.map((t) => `[${t}]`).join(' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <ProcStatusChip status={proc.status || 'PENDING'} />
                      {PROC_STATUSES.map((s) => {
                        const current = proc.status || 'PENDING';
                        if (s === current) return null;
                        // Only forward transitions: PENDING → IN_PROGRESS → COMPLETED
                        const order = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 } as const;
                        if (order[s] < order[current as keyof typeof order]) return null;
                        return (
                          <button
                            key={s}
                            disabled={updatingIdx === idx}
                            onClick={() => {
                              if (s === 'COMPLETED' && plan) {
                                const proc = plan.procedures[idx];
                                const due = Math.max(Number(proc.total || 0) - Number(proc.amountPaid || 0), 0);
                                setCompleteAmount(String(due > 0 ? due : proc.total));
                                setCompletePromptIdx(idx);
                              } else {
                                updateProcedureStatus(idx, s);
                              }
                            }}
                            title={`Mark as ${s.replace('_', ' ')}`}
                            className={`px-2 py-1 text-[10px] rounded border transition-colors disabled:opacity-50 ${
                              s === 'COMPLETED'
                                ? 'border-green-300 text-green-700 hover:bg-green-50'
                                : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            }`}
                          >
                            {s === 'COMPLETED' ? 'Complete' : s === 'IN_PROGRESS' ? 'Start' : s}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{Number(plan.totalCost || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Discount</p>
            <p className="text-xl font-bold text-red-600">
              ₹{Number(plan.totalDiscount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-xs text-blue-500">Grand Total</p>
            <p className="text-xl font-bold text-blue-700">
              ₹{Number(plan.grandTotal || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-xs text-green-600">Amount Paid</p>
            <p className="text-xl font-bold text-green-700">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-xs text-red-600">Balance Due</p>
            <p className="text-xl font-bold text-red-700">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-4 flex flex-col justify-center">
            <p className="text-xs text-gray-500">Payment Status</p>
            <span
              className={`mt-1 inline-block w-fit px-3 py-1 text-sm rounded-full font-semibold ${
                paymentStatus === 'PAID'
                  ? 'bg-green-100 text-green-700'
                  : paymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {paymentStatus}
            </span>
          </div>
        </div>
        {balanceDue > 0 && (
          <div className="mt-4">
            <button
              onClick={() => {
                setPaymentTargets(new Set());
                setPaymentAmount('');
                setShowPaymentModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              Record Payment
            </button>
          </div>
        )}

        {plan.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.notes}</p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
            <p className="text-sm text-gray-600 mb-3">
              Balance due: <span className="font-bold text-red-600">₹{balanceDue.toLocaleString('en-IN')}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Apply to procedures (optional - leave empty to auto-distribute)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                  {plan.procedures.map((proc, idx) => {
                    const paid = Number(proc.amountPaid || 0);
                    const due = Math.max(Number(proc.total || 0) - paid, 0);
                    if (due <= 0) return null;
                    return (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={paymentTargets.has(idx)}
                          onChange={() => {
                            setPaymentTargets((prev) => {
                              const next = new Set(prev);
                              if (next.has(idx)) next.delete(idx);
                              else next.add(idx);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="flex-1 truncate">{proc.procedureName}</span>
                        <span className="text-xs text-gray-500">Due ₹{due.toLocaleString('en-IN')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={recordingPayment || !paymentAmount}
                onClick={async () => {
                  const amount = Number(paymentAmount);
                  if (!amount || amount <= 0) {
                    alert('Enter a valid amount');
                    return;
                  }
                  if (amount > balanceDue) {
                    alert('Amount exceeds balance due');
                    return;
                  }
                  setRecordingPayment(true);
                  try {
                    const res = await fetch(`/api/treatment-plans/${planId}/record-payment`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount,
                        procedureIndices: paymentTargets.size > 0 ? Array.from(paymentTargets) : undefined,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setPlan(data.plan);
                      setShowPaymentModal(false);
                      setPaymentAmount('');
                      setPaymentTargets(new Set());
                    } else {
                      alert(data.error || 'Failed to record payment');
                    }
                  } catch {
                    alert('Failed to record payment');
                  } finally {
                    setRecordingPayment(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {recordingPayment ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Procedure Payment Prompt */}
      {completePromptIdx !== null && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Mark as Completed</h3>
            <p className="text-sm text-gray-600 mt-1">
              {plan.procedures[completePromptIdx].procedureName} — Total:{' '}
              <span className="font-semibold">₹{Number(plan.procedures[completePromptIdx].total).toLocaleString('en-IN')}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">How much was paid for this procedure?</p>
            <input
              type="number"
              min="0"
              max={plan.procedures[completePromptIdx].total}
              value={completeAmount}
              onChange={(e) => setCompleteAmount(e.target.value)}
              placeholder="Amount paid"
              className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Default is full amount. Adjust for partial payment.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setCompletePromptIdx(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={updatingIdx === completePromptIdx}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {updatingIdx === completePromptIdx ? 'Saving...' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
