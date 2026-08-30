'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/components/patients/shared';

interface PlanProcedure {
  procedureId: string;
  procedureName: string;
  qty: number;
  unitCost: number;
  discount: number;
  total: number;
  toothNumbers?: number[] | null;
  notes?: string | null;
  status?: string;
  amountPaid?: number;
}

interface TreatmentPlan {
  planId: string;
  title: string | null;
  status: string;
  procedures: PlanProcedure[] | null;
  grandTotal: string;
  totalCost: string;
  totalDiscount: string;
  notes: string | null;
  createdAt: string;
}

const statusColor = (s: string) =>
  s === 'ACTIVE'
    ? 'bg-green-100 text-green-700'
    : s === 'COMPLETED'
      ? 'bg-blue-100 text-blue-700'
      : s === 'PAUSED'
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-100 text-gray-600';

export default function NewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const preselectedPlanId = searchParams.get('planId') || '';

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState(preselectedPlanId);
  const [planDetails, setPlanDetails] = useState<Record<string, TreatmentPlan>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<Record<string, Set<number>>>({});
  const [generating, setGenerating] = useState<string | null>(null);

  const loadPlanDetail = async (planId: string) => {
    setLoadingDetail(planId);
    try {
      const res = await fetch(`/api/treatment-plans/${planId}`);
      const data = await res.json();
      if (res.ok && data.plan) {
        setPlanDetails((prev) => ({ ...prev, [planId]: data.plan }));
        const procs = data.plan.procedures || [];
        setSelectedProcedures((prev) => ({
          ...prev,
          [planId]: new Set(procs.map((_: PlanProcedure, i: number) => i)),
        }));
      }
    } catch {
      // empty
    } finally {
      setLoadingDetail(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          const allPlans = (data.plans || []) as TreatmentPlan[];
          const filtered = allPlans.filter((p) => p.procedures && p.procedures.length > 0);
          setPlans(filtered);
          if (preselectedPlanId && filtered.some((p) => p.planId === preselectedPlanId)) {
            loadPlanDetail(preselectedPlanId);
          }
        }
      } catch {
        // empty
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    };
    if (patientId) load();
    return () => { cancelled = true; };
  }, [patientId, preselectedPlanId]);

  const toggleExpand = async (planId: string) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId('');
      return;
    }
    setExpandedPlanId(planId);
    if (!planDetails[planId]) {
      loadPlanDetail(planId);
    }
  };

  const toggleProcedure = (planId: string, idx: number) => {
    setSelectedProcedures((prev) => {
      const current = prev[planId] || new Set<number>();
      const next = new Set(current);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...prev, [planId]: next };
    });
  };

  const toggleAll = (planId: string) => {
    const plan = planDetails[planId];
    if (!plan) return;
    const procs = plan.procedures || [];
    const current = selectedProcedures[planId] || new Set<number>();
    if (current.size === procs.length) {
      setSelectedProcedures((prev) => ({ ...prev, [planId]: new Set() }));
    } else {
      setSelectedProcedures((prev) => ({
        ...prev,
        [planId]: new Set(procs.map((_: PlanProcedure, i: number) => i)),
      }));
    }
  };

  const getSelectedTotal = (planId: string) => {
    const plan = planDetails[planId];
    const sel = selectedProcedures[planId];
    if (!plan || !sel) return 0;
    return (plan.procedures || [])
      .filter((_, i) => sel.has(i))
      .reduce((sum, p) => sum + Number(p.total || 0), 0);
  };

  const handleGenerate = async (planId: string) => {
    const sel = selectedProcedures[planId];
    if (!sel || sel.size === 0) return;
    setGenerating(planId);
    try {
      const res = await fetch('/api/invoices/generate-from-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, selectedIndices: Array.from(sel) }),
      });
      const data = await res.json();
      if (res.ok && data.invoiceId) {
        router.push(`/invoices/${data.invoiceId}`);
      } else {
        alert(data.error || 'Failed to generate invoice');
      }
    } catch {
      alert('Failed to generate invoice');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          New Invoice — {patientId}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a treatment plan below, choose procedures, then generate an invoice.
        </p>
      </div>

      {loadingPlans && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading treatment plans...
        </div>
      )}

      {!loadingPlans && plans.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-sm text-gray-500">
            No treatment plans with procedures found for this patient.
          </p>
        </div>
      )}

      {plans.map((plan) => {
        const isExpanded = expandedPlanId === plan.planId;
        const detail = planDetails[plan.planId];
        const isLoading = loadingDetail === plan.planId;
        const sel = selectedProcedures[plan.planId] || new Set<number>();
        const procs = detail?.procedures || [];
        const allSelected = procs.length > 0 && sel.size === procs.length;
        const selectedTotal = getSelectedTotal(plan.planId);

        return (
          <div key={plan.planId} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Plan Header — always visible */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(plan.planId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpand(plan.planId);
                }
              }}
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 select-none"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">
                    {plan.title || 'Untitled Plan'}
                  </h2>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${statusColor(plan.status)}`}>
                    {plan.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span>{plan.procedures?.length || 0} procedures</span>
                  <span>{formatMoney(plan.grandTotal)}</span>
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Expanded: Procedures Table */}
            {isExpanded && (
              <div className="border-t border-gray-200 px-4 pb-4">
                {isLoading && (
                  <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading procedures...
                  </div>
                )}

                {detail && !isLoading && (
                  <>
                    {detail.notes && (
                      <p className="text-xs text-gray-500 mt-3 mb-2">{detail.notes}</p>
                    )}

                    {procs.length > 0 && (
                      <>
                        <div className="flex items-center justify-between mt-3 mb-2">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleAll(plan.planId)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Select All ({sel.size} of {procs.length})
                          </label>
                        </div>

                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-2.5 text-left w-10"></th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Procedure</th>
                                <th className="px-4 py-2.5 text-center font-medium text-gray-600">QTY</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Unit Cost</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Discount</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {procs.map((proc, idx) => (
                                <tr
                                  key={`${proc.procedureId}-${idx}`}
                                  className={`hover:bg-gray-50 ${sel.has(idx) ? 'bg-blue-50/40' : ''}`}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={sel.has(idx)}
                                      onChange={() => toggleProcedure(plan.planId, idx)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-gray-900">{proc.procedureName}</p>
                                    {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        Teeth: {proc.toothNumbers.map((t) => `[${t}]`).join(' ')}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-700">{proc.qty}</td>
                                  <td className="px-4 py-3 text-right text-gray-700">
                                    {formatMoney(proc.unitCost)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-red-600">
                                    {formatMoney(proc.discount)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                    {formatMoney(proc.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary + Generate */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-500">Selected: </span>
                            <span className="font-bold text-gray-900">{formatMoney(selectedTotal)}</span>
                          </div>
                          <button
                            onClick={() => handleGenerate(plan.planId)}
                            disabled={generating === plan.planId || sel.size === 0}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {generating === plan.planId ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                              </>
                            ) : (
                              'Generate Invoice'
                            )}
                          </button>
                        </div>
                      </>
                    )}

                    {procs.length === 0 && (
                      <p className="text-sm text-gray-500 py-3">No procedures in this plan.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
