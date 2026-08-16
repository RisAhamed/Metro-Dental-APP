'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { VitalSignsInput, type VitalSigns } from './VitalSignsInput';
import { DoctorsMultiSelect, type InvolvedDoctor } from './DoctorsMultiSelect';
import { DentalChart } from '@/components/dental/DentalChart';

interface ChartEntry {
  region: string;
  toothNumber: string;
  procedureDone: string;
  notes: string | null;
}

interface Payment {
  paymentId: string;
  amount: number;
  mode: string;
  date: string;
  recordedBy: string;
  notes: string | null;
}

const VISIT_TYPES = ['NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE'];
const PAYMENT_MODES = ['CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'];

interface VisitFormProps {
  patientId: string;
  patientName: string;
  clinicId: string;
  visitId?: string;
  initial?: VisitData | null;
}

interface VisitData {
  visitId: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  injectionGiven: boolean;
  doctorsInvolved: InvolvedDoctor[];
  dentalChartEntries: ChartEntry[];
  vitalSigns: VitalSigns | null;
  treatmentCost: string;
  amountPaid: string;
  paymentStatus: string;
  payments: Payment[];
  additionalNotes: string | null;
  nextVisitDate: string | null;
  status: string;
}

const EMPTY_VITALS: VitalSigns = {
  age: null,
  weight: null,
  bloodPressure: null,
  bloodSugar: null,
  pulseRate: null,
  spo2: null,
};

export function VisitForm({ patientId, patientName, clinicId, visitId, initial }: VisitFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => ({
    visitDate: initial?.visitDate ? initial.visitDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    visitType: initial?.visitType || 'NEW_PROBLEM',
    chiefComplaint: initial?.chiefComplaint || '',
    diagnosis: initial?.diagnosis || '',
    treatmentGiven: initial?.treatmentGiven || '',
    injectionGiven: initial?.injectionGiven || false,
    doctorsInvolved: initial?.doctorsInvolved || [],
    dentalChartEntries: initial?.dentalChartEntries || [],
    vitalSigns: initial?.vitalSigns || EMPTY_VITALS,
    additionalNotes: initial?.additionalNotes || '',
    nextVisitDate: initial?.nextVisitDate ? initial.nextVisitDate.slice(0, 10) : '',
  }));
  const [treatmentCost, setTreatmentCost] = useState(() => Number(initial?.treatmentCost || 0));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'CASH', notes: '' });

  const isEdit = Boolean(visitId);

  const update = (key: string, val: unknown) => setForm((prev) => ({ ...prev, [key]: val }));

  const addChartEntry = () => {
    update('dentalChartEntries', [
      ...form.dentalChartEntries,
      { region: 'UPPER_JAW', toothNumber: '', procedureDone: '', notes: '' },
    ]);
  };

  const updateChartEntry = (idx: number, field: keyof ChartEntry, val: string) => {
    const entries = form.dentalChartEntries.map((e, i) => (i === idx ? { ...e, [field]: val } : e));
    update('dentalChartEntries', entries);
  };

  const removeChartEntry = (idx: number) => {
    update('dentalChartEntries', form.dentalChartEntries.filter((_, i) => i !== idx));
  };

  const selectedTeeth = form.dentalChartEntries.flatMap((e) =>
    e.toothNumber ? e.toothNumber.split(',').map((t) => t.trim()).filter(Boolean) : []
  );

  const setSelectedTeeth = (teeth: string[]) => {
    // Apply to the last chart entry's toothNumber
    const entries = form.dentalChartEntries.map((e, i) =>
      i === form.dentalChartEntries.length - 1 ? { ...e, toothNumber: teeth.join(',') } : e
    );
    update('dentalChartEntries', entries);
  };

  const recordPayment = () => {
    if (!paymentForm.amount) return;
    const res = fetch(`/api/visits/${visitId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: paymentForm.amount,
        mode: paymentForm.mode,
        notes: paymentForm.notes || undefined,
      }),
    });
    res
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          setShowPaymentModal(false);
          setPaymentForm({ amount: '', mode: 'CASH', notes: '' });
          router.refresh();
        } else {
          setError(data.error || 'Failed to record payment');
        }
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to record payment');
      });
  };

  const submit = async (status: 'DRAFT' | 'COMPLETED') => {
    setLoading(true);
    setError('');
    const payload = {
      ...form,
      treatmentCost,
      status,
    };

    try {
      const url = isEdit ? `/api/visits/${visitId}` : '/api/visits';
      const method = isEdit ? 'PUT' : 'POST';
      if (!isEdit) {
        Object.assign(payload, { patientId, patientName, clinicId });
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/patients/${patientId}/profile?tab=visits`);
      } else {
        setError(data.error || 'Failed to save visit');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to save visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {/* A. Visit Info */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <input
              type="text"
              value={patientName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.visitDate}
              onChange={(e) => update('visitDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.visitType}
              onChange={(e) => update('visitType', e.target.value)}
            >
              {VISIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* B. Vital Signs */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h2>
        <VitalSignsInput value={form.vitalSigns} onChange={(v) => update('vitalSigns', v)} />
      </section>

      {/* C. Clinical Details */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinical Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint *</label>
            <textarea
              rows={2}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.chiefComplaint}
              onChange={(e) => update('chiefComplaint', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.diagnosis}
              onChange={(e) => update('diagnosis', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Given</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.treatmentGiven}
              onChange={(e) => update('treatmentGiven', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.injectionGiven}
              onChange={(e) => update('injectionGiven', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Injection Given
          </label>
        </div>
      </section>

      {/* D. Dental Chart Entries */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Dental Chart Entries</h2>
          <button
            type="button"
            onClick={addChartEntry}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Entry
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Select teeth on the chart (applies to the last entry added):
          </p>
          <DentalChart selected={selectedTeeth} onChange={setSelectedTeeth} />
        </div>

        {form.dentalChartEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No chart entries added yet.</p>
        ) : (
          <div className="space-y-3">
            {form.dentalChartEntries.map((entry, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[160px_140px_1fr_1fr_auto] gap-3 items-start border border-gray-200 rounded-md p-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                  <select
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={entry.region}
                    onChange={(e) => updateChartEntry(idx, 'region', e.target.value)}
                  >
                    <option value="UPPER_JAW">Upper Jaw</option>
                    <option value="LOWER_JAW">Lower Jaw</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tooth Number</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={entry.toothNumber}
                    placeholder="e.g. 11,36"
                    onChange={(e) => updateChartEntry(idx, 'toothNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Procedure Done</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={entry.procedureDone}
                    onChange={(e) => updateChartEntry(idx, 'procedureDone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={entry.notes || ''}
                    onChange={(e) => updateChartEntry(idx, 'notes', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeChartEntry(idx)}
                  className="mt-5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* E. Doctors Involved */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Doctors Involved</h2>
        <DoctorsMultiSelect
          clinicId={clinicId}
          value={form.doctorsInvolved}
          onChange={(d) => update('doctorsInvolved', d)}
        />
      </section>

      {/* F. Billing & Payments */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing & Payments</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Cost (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={treatmentCost}
              onChange={(e) => setTreatmentCost(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              value={initial ? Number(initial.amountPaid || 0) : 0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              value={initial?.paymentStatus || 'UNPAID'}
            />
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            Record Payment
          </button>
        )}

        {isEdit && (initial?.payments?.length || 0) > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initial?.payments?.map((p) => (
                    <tr key={p.paymentId}>
                      <td className="px-3 py-2 text-sm text-gray-700">{p.date}</td>
                      <td className="px-3 py-2 text-sm font-semibold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.mode}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* G. Additional Notes & Next Visit */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes & Next Visit</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.additionalNotes}
              onChange={(e) => update('additionalNotes', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Visit Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.nextVisitDate}
              onChange={(e) => update('nextVisitDate', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
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
          onClick={() => submit('DRAFT')}
          className="px-4 py-2 border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          disabled={loading || !form.chiefComplaint.trim()}
          onClick={() => submit('COMPLETED')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Complete Session'}
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={recordPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}