'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { ProcedureSearch, type ProcedureOption } from '@/components/procedures/ProcedureSearch';
import { ProceduresSidebar } from '@/components/procedures/ProceduresSidebar';
import { DentalChart } from '@/components/dental/DentalChart';
import { AutoTextarea } from '@/components/patients/shared';

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
}

const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED'];

interface TreatmentPlanFormProps {
  patientId: string;
  clinicId: string;
  planId?: string;
  initial?: PlanData | null;
}

interface PlanData {
  planId: string;
  title: string | null;
  status: string;
  procedures: PlanProcedure[];
  notes: string | null;
  shareEnabled: boolean;
}

export function TreatmentPlanForm({ patientId, clinicId, planId, initial }: TreatmentPlanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(() => initial?.title || '');
  const [status, setStatus] = useState(() => initial?.status || 'DRAFT');
  const [procedures, setProcedures] = useState<PlanProcedure[]>(() => initial?.procedures || []);
  const [notes, setNotes] = useState(() => initial?.notes || '');
  const [chartRowIndex, setChartRowIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'adult' | 'child'>('adult');
  const [editingNameIdx, setEditingNameIdx] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const ADULT_ALL_TEETH = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
  ];
  const CHILD_ALL_TEETH = [
    55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
    85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
  ];

  const isEdit = Boolean(planId);

  const totals = procedures.reduce(
    (acc, p) => {
      acc.cost += p.unitCost * p.qty;
      acc.discount += p.discount;
      return acc;
    },
    { cost: 0, discount: 0 }
  );
  const grandTotal = totals.cost - totals.discount;

  const addProcedure = (proc: ProcedureOption) => {
    const cost = Number(proc.defaultCost || 0);
    setProcedures((prev) => [
      ...prev,
      {
        procedureId: proc.id,
        procedureName: proc.name,
        qty: 1,
        unitCost: cost,
        discount: 0,
        total: cost,
        toothNumbers: null,
        isFullMouth: false,
        isMultiplyCost: false,
        notes: null,
      },
    ]);
  };

  const updateProcedure = (idx: number, patch: Partial<PlanProcedure>) => {
    setProcedures((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, ...patch };
        next.total = next.qty * next.unitCost - next.discount;
        return next;
      })
    );
  };

  const removeProcedure = (idx: number) => {
    setProcedures((prev) => prev.filter((_, i) => i !== idx));
    if (chartRowIndex === idx) setChartRowIndex(null);
  };

  const startEditingName = (idx: number) => {
    setEditingNameIdx(idx);
    setDraftName(procedures[idx]?.procedureName || '');
  };

  const saveName = (idx: number) => {
    const cleaned = draftName.trim();
    if (!cleaned) return;
    updateProcedure(idx, { procedureName: cleaned });
    setEditingNameIdx(null);
    setDraftName('');
  };

  const selectedTeethForRow = (proc: PlanProcedure) =>
    (proc.toothNumbers || []).map(String);

  const setTeethForRow = (teeth: string[]) => {
    if (chartRowIndex === null) return;
    const nums = teeth.map(Number).filter((n) => !Number.isNaN(n));
    const currentProc = procedures[chartRowIndex];
    const isFullMouthSelection =
      chartMode === 'child'
        ? CHILD_ALL_TEETH.every((t) => nums.includes(t))
        : ADULT_ALL_TEETH.every((t) => nums.includes(t));
    updateProcedure(chartRowIndex, {
      toothNumbers: nums.length ? nums : null,
      isFullMouth: isFullMouthSelection,
      ...(currentProc?.isMultiplyCost ? { qty: nums.length > 0 ? nums.length : 1 } : {}),
    });
  };

  const toggleFullMouthForRow = (idx: number) => {
    const proc = procedures[idx];
    if (!proc) return;
    const allTeeth = chartMode === 'child' ? CHILD_ALL_TEETH : ADULT_ALL_TEETH;
    const next = !proc.isFullMouth;
    updateProcedure(idx, {
      isFullMouth: next,
      toothNumbers: next ? allTeeth : null,
      isMultiplyCost: next ? true : proc.isMultiplyCost,
      qty: next ? allTeeth.length : proc.isMultiplyCost && proc.toothNumbers ? proc.toothNumbers.length : proc.qty,
    });
  };

  const toggleMultiplyCost = (idx: number) => {
    const proc = procedures[idx];
    if (!proc) return;
    const next = !proc.isMultiplyCost;
    const teethCount = proc.toothNumbers?.length ?? 0;
    updateProcedure(idx, {
      isMultiplyCost: next,
      qty: next && teethCount > 0 ? teethCount : proc.qty,
    });
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    const payload = {
      title: title || null,
      status,
      procedures,
      notes: notes || null,
    };

    try {
      const url = isEdit ? `/api/treatment-plans/${planId}` : '/api/treatment-plans';
      const method = isEdit ? 'PUT' : 'POST';
      if (!isEdit) {
        Object.assign(payload, { patientId, clinicId });
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/patients/${patientId}/profile?tab=treatment-plans`);
      } else {
        setError(data.error || 'Failed to save treatment plan');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to save treatment plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ProceduresSidebar onSelect={addProcedure} />
      <div className="flex-1 space-y-6 min-w-0">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={title}
                placeholder="e.g. Full Mouth Rehabilitation"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PLAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Procedures</h2>
            <span className="text-xs text-gray-500">Tip: Click a procedure in the left sidebar to add it</span>
          </div>

          <div className="mb-6">
            <ProcedureSearch onSelect={addProcedure} placeholder="Search procedure to add to plan..." allowCustom />
          </div>

        {procedures.length === 0 ? (
          <p className="text-sm text-gray-500">No procedures added yet. Search above to add one.</p>
        ) : (
          <div className="space-y-4">
            {procedures.map((proc, idx) => (
              <div key={`${proc.procedureId}-${idx}`} className="border border-gray-200 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {editingNameIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        autoFocus
                        className="flex-1 px-2 py-1 border border-blue-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(idx);
                          if (e.key === 'Escape') setEditingNameIdx(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => saveName(idx)}
                        className="text-green-600 hover:text-green-700"
                        title="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNameIdx(null)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{proc.procedureName}</p>
                      <button
                        type="button"
                        onClick={() => startEditingName(idx)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit procedure name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeProcedure(idx)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      QTY {proc.isMultiplyCost && <span className="font-normal text-gray-400">(auto)</span>}
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={proc.isMultiplyCost}
                      title={proc.isMultiplyCost ? 'QTY is auto-calculated from selected teeth when Multiply Cost is ON' : undefined}
                      className={`w-full px-2 py-1.5 border rounded-md text-sm ${proc.isMultiplyCost ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                      value={proc.qty}
                      onChange={(e) => updateProcedure(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Procedure Status</label>
                    <select
                      value={proc.status || 'PENDING'}
                      onChange={(e) => updateProcedure(idx, { status: e.target.value as PlanProcedure['status'] })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      value={proc.unitCost}
                      onChange={(e) => updateProcedure(idx, { unitCost: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      value={proc.discount}
                      onChange={(e) => updateProcedure(idx, { discount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Total (₹)</label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-50 font-semibold"
                      value={proc.total.toLocaleString('en-IN')}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proc.isFullMouth}
                        onChange={() => toggleFullMouthForRow(idx)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                      />
                      Full Mouth
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proc.isMultiplyCost}
                        onChange={() => toggleMultiplyCost(idx)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                      />
                      Multiply Cost
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Teeth Selection</p>
                    {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {proc.toothNumbers.length} teeth selected
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setChartRowIndex(chartRowIndex === idx ? null : idx)}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      chartRowIndex === idx
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {chartRowIndex === idx ? 'Hide Chart' : 'Select Teeth'}
                  </button>

                  {chartRowIndex === idx && (
                    <div className="mt-3">
                      <DentalChart
                        selected={selectedTeethForRow(proc)}
                        onChange={setTeethForRow}
                        mode={chartMode}
                        onModeChange={setChartMode}
                        showFullMouth={false}
                      />
                    </div>
                  )}

                  {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {proc.toothNumbers.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <AutoTextarea
                    value={proc.notes || ''}
                    onChange={(v) => updateProcedure(idx, { notes: v || null })}
                    minRows={4}
                    placeholder="Optional notes for this procedure..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">₹{totals.cost.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">Total Discount</p>
            <p className="text-xl font-bold text-red-600">₹{totals.discount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-xs text-blue-500">Grand Total</p>
            <p className="text-xl font-bold text-blue-700">₹{grandTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Notes</label>
          <AutoTextarea
            value={notes}
            onChange={setNotes}
            minRows={5}
            placeholder="Global notes for this treatment plan..."
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
      </div>
    </div>
  );
}