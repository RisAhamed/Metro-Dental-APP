'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  category?: string;
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
  createdByName?: string;
}

interface PlanData {
  planId: string;
  title: string | null;
  status: string;
  procedures: PlanProcedure[];
  notes: string | null;
  shareEnabled: boolean;
  createdByName?: string;
}

export function TreatmentPlanForm({ patientId, clinicId, planId, initial, createdByName }: TreatmentPlanFormProps) {
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
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [planNotesExpanded, setPlanNotesExpanded] = useState(false);

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
      createdByName: createdByName || initial?.createdByName || null,
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

  const toggleNoteExpand = (idx: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>
        )}

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Plan Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={title}
                placeholder="e.g. Full Mouth Rehabilitation"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PLAN_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {createdByName && (
            <p className="text-xs text-gray-500 mt-2">Planned by Dr. {createdByName} on {new Date().toLocaleDateString('en-IN')}</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Procedures ({procedures.length})</h2>
            <span className="text-xs text-gray-400">Search below to add</span>
          </div>
          <div className="mb-3">
            <ProcedureSearch onSelect={addProcedure} placeholder="Search procedure..." allowCustom />
          </div>

          {procedures.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No procedures added yet.</p>
          ) : (
            <div className="space-y-2">
              {procedures.map((proc, idx) => (
                <div key={`${proc.procedureId}-${idx}`} className="border border-gray-200 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {editingNameIdx === idx ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input autoFocus className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm" value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(idx); if (e.key === 'Escape') setEditingNameIdx(null); }} />
                        <button onClick={() => saveName(idx)} className="text-green-600"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingNameIdx(null)} className="text-gray-400"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{proc.procedureName}</span>
                        {proc.category && <span className="text-xs text-gray-400 hidden sm:inline">{proc.category}</span>}
                        <button onClick={() => startEditingName(idx)} className="text-gray-400 hover:text-blue-600 flex-shrink-0"><Pencil className="h-3 w-3" /></button>
                        <button onClick={() => removeProcedure(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">QTY {proc.isMultiplyCost && '(auto)'}</label>
                      <input type="number" min="1" disabled={proc.isMultiplyCost} className={`w-full px-2 py-1 border rounded text-sm ${proc.isMultiplyCost ? 'bg-gray-100 text-gray-400' : 'border-gray-300'}`} value={proc.qty} onChange={(e) => updateProcedure(idx, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Status</label>
                      <select value={proc.status || 'PENDING'} onChange={(e) => updateProcedure(idx, { status: e.target.value as PlanProcedure['status'] })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Unit ₹</label>
                      <input type="number" min="0" step="0.01" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" value={proc.unitCost} onChange={(e) => updateProcedure(idx, { unitCost: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Disc</label>
                      <input type="number" min="0" step="0.01" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" value={proc.discount} onChange={(e) => updateProcedure(idx, { discount: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Total</label>
                      <input type="text" disabled className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 font-semibold" value={proc.total.toLocaleString('en-IN')} />
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={proc.isFullMouth} onChange={() => toggleFullMouthForRow(idx)} /> FM</label>
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={proc.isMultiplyCost} onChange={() => toggleMultiplyCost(idx)} /> MC</label>
                    </div>
                  </div>
                  <div>
                    <button type="button" onClick={() => { setChartRowIndex(chartRowIndex === idx ? null : idx); if (chartRowIndex !== idx) setExpandedNotes((p) => { const n = new Set(p); n.delete(idx); return n; }); }} className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:border-blue-400">
                      {chartRowIndex === idx ? 'Hide Chart' : 'Select Teeth'}
                    </button>
                    {chartRowIndex === idx && (
                      <div className="mt-2">
                        <DentalChart selected={selectedTeethForRow(proc)} onChange={setTeethForRow} mode={chartMode} onModeChange={setChartMode} showFullMouth={false} />
                      </div>
                    )}
                  </div>
                  {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proc.toothNumbers.map((t) => <span key={t} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">{t}</span>)}
                    </div>
                  )}
                  <div>
                    {expandedNotes.has(idx) ? (
                      <div>
                        <AutoTextarea value={proc.notes || ''} onChange={(v) => updateProcedure(idx, { notes: v || null })} minRows={2} placeholder="Notes..." />
                        <button onClick={() => toggleNoteExpand(idx)} className="mt-1 text-xs text-gray-400 hover:text-gray-600">Hide notes</button>
                      </div>
                    ) : (
                      <button onClick={() => toggleNoteExpand(idx)} className="text-xs text-blue-600 hover:underline">
                        {proc.notes ? `Edit notes (${proc.notes.length} chars)` : '+ Add notes'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-[10px] text-gray-500">Total Cost</p>
              <p className="text-base font-bold">₹{totals.cost.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-[10px] text-gray-500">Discount</p>
              <p className="text-base font-bold text-red-600">₹{totals.discount.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-[10px] text-blue-500">Grand Total</p>
              <p className="text-base font-bold text-blue-700">₹{grandTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="mt-3">
            {planNotesExpanded ? (
              <div>
                <AutoTextarea value={notes} onChange={setNotes} minRows={2} placeholder="Plan notes..." />
                <button onClick={() => setPlanNotesExpanded(false)} className="mt-1 text-xs text-gray-400 hover:text-gray-600">Hide notes</button>
              </div>
            ) : (
              <button onClick={() => setPlanNotesExpanded(true)} className="text-xs text-blue-600 hover:underline">
                {notes ? `Edit plan notes (${notes.length} chars)` : '+ Add plan notes'}
              </button>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <button onClick={() => router.back()} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">Cancel</button>
          <button disabled={loading} onClick={submit} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save Plan'}</button>
        </div>
      </div>

      <div className="hidden lg:block w-[300px] flex-shrink-0">
        <ProceduresSidebar onSelect={addProcedure} />
      </div>
    </div>
  );
}
