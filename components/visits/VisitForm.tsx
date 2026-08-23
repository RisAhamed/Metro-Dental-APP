'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Plus, Trash2, UploadCloud, FileText, Download, X } from 'lucide-react';
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
  recordedByName: string | null;
  notes: string | null;
}

interface VisitFile {
  fileId: string;
  fileName: string;
  url: string;
  type?: string;
}

const VISIT_TYPES = ['NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE'];
const PAYMENT_MODES = ['CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'];

// Roles allowed to edit all clinical fields
const FULL_EDIT_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'];
// Roles allowed to edit billing/payment fields only
const BILLING_EDIT_ROLES = ['RECEPTIONIST'];

interface VisitFormProps {
  patientId: string;
  patientName: string;
  clinicId: string;
  visitId?: string;
  initial?: VisitData | null;
  readOnly?: boolean;
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
  fileIds: VisitFile[];
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

export function VisitForm({ patientId, patientName, clinicId, visitId, initial, readOnly }: VisitFormProps) {
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const userRole = String(sessionClaims?.role || '');
  const canFullEdit = FULL_EDIT_ROLES.includes(userRole);
  const canBillingEdit = canFullEdit || BILLING_EDIT_ROLES.includes(userRole);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [amountPaid, setAmountPaid] = useState(() => Number(initial?.amountPaid || 0));
  const [paymentMode, setPaymentMode] = useState(() => initial?.payments?.[initial.payments.length - 1]?.mode || 'CASH');
  const [files, setFiles] = useState<VisitFile[]>(() => initial?.fileIds || []);
  const [uploading, setUploading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'CASH', notes: '' });

  const isEdit = Boolean(visitId);
  const isReadOnly = readOnly || initial?.status === 'COMPLETED';
  // Clinical fields: editable only by full-edit roles (and not completed/read-only)
  const clinicalDisabled = isReadOnly || !canFullEdit;
  // Billing fields: editable by full-edit roles and receptionists (and not completed/read-only)
  const billingDisabled = isReadOnly || !canBillingEdit;
  const canEditAnything = isEdit ? canBillingEdit : canFullEdit;

  const paymentStatus = treatmentCost > 0
    ? amountPaid >= treatmentCost
      ? 'PAID'
      : amountPaid > 0
        ? 'PARTIALLY_PAID'
        : 'UNPAID'
    : amountPaid > 0
      ? 'PAID'
      : 'UNPAID';

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
          if (data.visit) {
            setAmountPaid(Number(data.visit.amountPaid || 0));
            setPaymentMode(data.visit.payments?.[data.visit.payments.length - 1]?.mode || paymentForm.mode);
          }
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

  const uploadFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0 || clinicalDisabled) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(selected)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/visit-file', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.file) {
          setFiles((prev) => [...prev, data.file]);
        } else {
          setError(data.error || `Failed to upload ${file.name}`);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = async (file: VisitFile) => {
    if (isReadOnly || !canFullEdit) return;
    setFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
    try {
      await fetch(`/api/upload/visit-file?key=${encodeURIComponent(file.fileId)}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const submit = async (status: 'DRAFT' | 'COMPLETED') => {
    setLoading(true);
    setError('');
    // Receptionists may only submit billing/payment fields
    let payload: Record<string, unknown>;
    if (isEdit && !canFullEdit) {
      payload = {
        treatmentCost,
        amountPaid,
        paymentStatus,
        payments: initial?.payments || [],
      };
    } else {
      payload = {
        ...form,
        treatmentCost,
        amountPaid,
        fileIds: files,
        paymentStatus,
        status,
      };
    }

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
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.visitDate}
              onChange={(e) => update('visitDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
            <select
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
        <VitalSignsInput value={form.vitalSigns} onChange={(v) => update('vitalSigns', v)} disabled={clinicalDisabled} />
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
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.chiefComplaint}
              onChange={(e) => update('chiefComplaint', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <textarea
              rows={2}
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.diagnosis}
              onChange={(e) => update('diagnosis', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Given</label>
            <textarea
              rows={2}
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.treatmentGiven}
              onChange={(e) => update('treatmentGiven', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              disabled={clinicalDisabled}
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
            disabled={clinicalDisabled}
            onClick={addChartEntry}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Entry
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Select teeth on the chart (applies to the last entry added):
          </p>
          <DentalChart selected={selectedTeeth} onChange={setSelectedTeeth} disabled={clinicalDisabled} />
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
                    disabled={clinicalDisabled}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
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
                    disabled={clinicalDisabled}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                    value={entry.toothNumber}
                    placeholder="e.g. 11,36"
                    onChange={(e) => updateChartEntry(idx, 'toothNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Procedure Done</label>
                  <input
                    type="text"
                    disabled={clinicalDisabled}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                    value={entry.procedureDone}
                    onChange={(e) => updateChartEntry(idx, 'procedureDone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    disabled={clinicalDisabled}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                    value={entry.notes || ''}
                    onChange={(e) => updateChartEntry(idx, 'notes', e.target.value)}
                  />
                </div>
                {!clinicalDisabled && (
                  <button
                    type="button"
                    onClick={() => removeChartEntry(idx)}
                    className="mt-5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
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
          disabled={clinicalDisabled}
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
              disabled={billingDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-700"
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
              disabled={billingDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-700"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
            <select
              disabled={billingDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-50 disabled:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <span className="text-sm font-medium text-gray-700">
            Payment Status:&nbsp;
            <span
              className={`font-semibold ${
                paymentStatus === 'PAID'
                  ? 'text-green-600'
                  : paymentStatus === 'PARTIALLY_PAID'
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {paymentStatus.replace(/_/g, ' ')}
            </span>
          </span>
        </div>

        {isEdit && !billingDisabled && (
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initial?.payments?.map((p) => (
                    <tr key={p.paymentId}>
                      <td className="px-3 py-2 text-sm text-gray-700">{p.date}</td>
                      <td className="px-3 py-2 text-sm font-semibold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.mode}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.recordedByName || p.recordedBy || '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* G. Files */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Files</h2>

        {!clinicalDisabled && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm hover:bg-blue-100 disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <p className="text-xs text-gray-500 mt-1">Reports, X-rays, prescriptions, etc. (max 10MB each)</p>
          </div>
        )}

        {files.length === 0 ? (
          <p className="text-sm text-gray-500">No files attached to this session.</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.fileId}
                className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{f.fileName}</span>
                <a
                  href={`/api/upload/visit-file/download?key=${encodeURIComponent(f.fileId)}&name=${encodeURIComponent(f.fileName)}&inline=${f.type?.startsWith('image/') ? 1 : 0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Download className="h-4 w-4" /> View / Download
                </a>
                {!clinicalDisabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(f)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* H. Additional Notes & Next Visit */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes & Next Visit</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.additionalNotes}
              onChange={(e) => update('additionalNotes', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Visit Date</label>
            <input
              type="date"
              disabled={clinicalDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={form.nextVisitDate}
              onChange={(e) => update('nextVisitDate', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      {isReadOnly || !canEditAnything ? (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Back to Profile
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          {isEdit && !canFullEdit ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => submit('DRAFT')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Billing'}
            </button>
          ) : (
            <>
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
                disabled={loading || (isEdit ? false : !form.chiefComplaint.trim())}
                onClick={() => submit('COMPLETED')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Session'}
              </button>
            </>
          )}
        </div>
      )}

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