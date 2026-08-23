'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  FileText,
  ExternalLink,
  Activity,
  Stethoscope,
  Users,
  ClipboardList,
  DollarSign,
} from 'lucide-react';

const FULL_EDIT_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'];
const BILLING_EDIT_ROLES = ['RECEPTIONIST'];

interface ChartEntry {
  region: string;
  toothNumber: string;
  procedureDone: string;
  notes: string | null;
}

interface VisitFile {
  fileId: string;
  fileName: string;
  url: string;
  type?: string;
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

interface Visit {
  visitId: string;
  visitDate: string;
  visitType: string;
  status: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  injectionGiven: boolean;
  doctorsInvolved: { doctorId: string; doctorName: string; role: string }[];
  dentalChartEntries: ChartEntry[];
  vitalSigns: {
    age: number | null;
    weight: number | null;
    bloodPressure: string | null;
    bloodSugar: number | null;
    pulseRate: number | null;
    spo2: number | null;
  } | null;
  treatmentCost: string;
  amountPaid: string;
  paymentStatus: string;
  payments: Payment[];
  fileIds: VisitFile[];
  additionalNotes: string | null;
  nextVisitDate: string | null;
}

const VITAL_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'age', label: 'Age (years)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'bloodPressure', label: 'Blood Pressure' },
  { key: 'bloodSugar', label: 'Blood Sugar (mg/dL)' },
  { key: 'pulseRate', label: 'Pulse Rate (bpm)' },
  { key: 'spo2', label: 'SPO2 (%)' },
];

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-blue-500" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function formatDate(input: string | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(input: string | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ViewVisitPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const visitId = Array.isArray(params.visitId) ? params.visitId[0] : params.visitId || '';

  const role = String(sessionClaims?.role || '');
  const canFullEdit = FULL_EDIT_ROLES.includes(role);
  const canBillingEdit = canFullEdit || BILLING_EDIT_ROLES.includes(role);
  const canEdit = visit?.status !== 'COMPLETED' && canBillingEdit;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/visits/${visitId}`);
        const data = await res.json();
        if (res.ok) setVisit(data.visit);
        else setNotFound(true);
      } catch (error) {
        console.error('Error loading visit:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (visitId) load();
  }, [visitId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (notFound || !visit) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Visit not found</p>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  const paymentStatusColor =
    visit.paymentStatus === 'PAID'
      ? 'bg-green-100 text-green-700'
      : visit.paymentStatus === 'PARTIALLY_PAID'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Session — {visit.visitId}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(visit.visitDate)}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push(`/patients/${patientId}/visits/${visitId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4" /> {canFullEdit ? 'Edit Session' : 'Edit Billing'}
          </button>
        )}
      </div>

      {/* Visit Info */}
      <Section title="Visit Info" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Visit ID" value={visit.visitId} />
          <Field label="Visit Date" value={formatDate(visit.visitDate)} />
          <Field label="Visit Type" value={visit.visitType.replace(/_/g, ' ')} />
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full ${
              visit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {visit.status}
            </span>
          </div>
        </div>
      </Section>

      {/* Vital Signs */}
      <Section title="Vital Signs" icon={Stethoscope}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {VITAL_FIELDS.map((f) => {
            const v = visit.vitalSigns ? (visit.vitalSigns as Record<string, unknown>)[f.key] : null;
            return <Field key={f.key} label={f.label} value={v === null || v === undefined ? null : String(v)} />;
          })}
        </div>
      </Section>

      {/* Clinical Details */}
      <Section title="Clinical Details" icon={ClipboardList}>
        <div className="space-y-4">
          <Field label="Chief Complaint" value={visit.chiefComplaint} />
          <Field label="Diagnosis" value={visit.diagnosis} />
          <Field label="Treatment Given" value={visit.treatmentGiven} />
          <Field label="Injection Given" value={visit.injectionGiven ? 'Yes' : 'No'} />
        </div>
      </Section>

      {/* Dental Chart Entries */}
      <Section title="Dental Chart Entries" icon={Stethoscope}>
        {!visit.dentalChartEntries || visit.dentalChartEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No chart entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tooth Number</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Procedure Done</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visit.dentalChartEntries.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-sm text-gray-700">{e.region.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{e.toothNumber}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{e.procedureDone}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{e.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Doctors Involved */}
      <Section title="Doctors Involved" icon={Users}>
        {!visit.doctorsInvolved || visit.doctorsInvolved.length === 0 ? (
          <p className="text-sm text-gray-500">No doctors recorded.</p>
        ) : (
          <div className="space-y-2">
            {visit.doctorsInvolved.map((d) => (
              <div key={d.doctorId} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                <span className="text-sm font-medium text-gray-800 flex-1">{d.doctorName}</span>
                <span className="text-xs text-gray-500">{d.role}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Files */}
      <Section title="Session Files" icon={FileText}>
        {!visit.fileIds || visit.fileIds.length === 0 ? (
          <p className="text-sm text-gray-500">No files attached to this session.</p>
        ) : (
          <div className="space-y-2">
            {visit.fileIds.map((f) => (
              <div key={f.fileId} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{f.fileName}</span>
                <a
                  href={`/api/upload/visit-file/download?key=${encodeURIComponent(f.fileId)}&name=${encodeURIComponent(f.fileName)}&inline=${f.type?.startsWith('image/') ? 1 : 0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> View / Download
                </a>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Billing & Payments */}
      <Section title="Billing & Payments" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Field label="Treatment Cost (₹)" value={`₹${Number(visit.treatmentCost || 0).toLocaleString('en-IN')}`} />
          <Field label="Amount Paid (₹)" value={`₹${Number(visit.amountPaid || 0).toLocaleString('en-IN')}`} />
          <div>
            <p className="text-xs text-gray-500">Payment Status</p>
            <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full ${paymentStatusColor}`}>
              {visit.paymentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {!visit.payments || visit.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded.</p>
        ) : (
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
                {visit.payments.map((p) => (
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
        )}
      </Section>

      {/* Additional Notes */}
      <Section title="Additional Notes" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Additional Notes" value={visit.additionalNotes} />
          <Field label="Next Visit Date" value={formatDate(visit.nextVisitDate)} />
        </div>
      </Section>
    </div>
  );
}