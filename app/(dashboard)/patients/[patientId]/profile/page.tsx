'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplet,
  Users,
  HeartPulse,
  Tag,
  Stethoscope,
  User,
  ArrowLeft,
  Plus,
  Pencil,
} from 'lucide-react';
import { PatientSidebar, type PatientSection } from '@/components/patients/PatientSidebar';
import { PatientAppointments } from '@/components/patients/PatientAppointments';
import { PatientTreatmentPlans } from '@/components/patients/PatientTreatmentPlans';
import {
  PatientCompletedProcedures,
  type CompletedProcedure,
} from '@/components/patients/PatientCompletedProcedures';
import { VitalSignsDisplay } from '@/components/patients/VitalSignsDisplay';
import ClinicalNoteList from '@/components/clinical/ClinicalNoteList';
import { PatientTimeline, type TimelineEntry } from '@/components/patients/PatientTimeline';
import { PatientFiles } from '@/components/patients/PatientFiles';
import { PatientPrescriptions } from '@/components/patients/PatientPrescriptions';
import {
  PatientPaymentsSection,
  PatientLedger,
} from '@/components/patients/PatientInvoices';
import { PatientRealInvoices } from '@/components/patients/PatientRealInvoices';
import { PatientProfileEdit, type EditablePatient } from '@/components/patients/PatientProfileEdit';
import { VisitEditModal, type EditableVisit } from '@/components/patients/VisitEditModal';
import { AppointmentModal } from '@/components/calendar/AppointmentModal';

interface Patient {
  patientId: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  age: number | null;
  bloodGroup: string | null;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  anniversary: string | null;
  address: {
    street: string;
    locality: string;
    city: string;
    pincode: string;
  } | null;
  referredByName: string | null;
  medicalHistory: string[];
  otherHistory: string | null;
  groups: string[];
  languagePreference: string | null;
  primaryDoctorName: string | null;
  registeredClinicId: string;
  advanceBalance: string;
  totalDue: string;
  totalPaid: string;
  lastVisitDate: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Payment {
  paymentId: string;
  amount: string;
  mode: string;
  date: string;
  recordedByName: string;
  notes: string | null;
}

interface VisitFull {
  visitId: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  additionalNotes: string | null;
  doctorsInvolved: Array<{ doctorId: string; doctorName: string; role: string }> | null;
  dentalChartEntries: Array<{
    region: string;
    toothNumber: string;
    procedureDone: string;
    notes: string | null;
  }> | null;
  vitalSigns: {
    age?: number | null;
    weight?: number | null;
    bloodPressure?: string | null;
    bloodSugar?: number | null;
    pulseRate?: number | null;
    spo2?: number | null;
  } | null;
  fileIds: Array<{
    fileId: string;
    fileName: string;
    url: string;
    type: string;
  }> | null;
  treatmentCost: string;
  amountPaid: string;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | null;
  status: string;
}

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  procedures: Array<{
    procedureId: string;
    procedureName: string;
    qty: number;
    unitCost: number;
    discount: number;
    total: number;
    toothNumbers?: number[] | null;
    isFullMouth?: boolean;
    notes?: string | null;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    completedAt?: string | null;
    completedByName?: string | null;
  }> | null;
  totalCost: string;
  totalDiscount: string;
  grandTotal: string;
  createdAt: string;
}

interface AppointmentRow {
  appointmentId: string;
  appointmentDate: string;
  doctorName: string;
  categoryName: string | null;
  status: string;
  isWalkIn: boolean;
  tokenNumber: string | null;
  durationMinutes: number;
}

const PAYMENT_MODES = ['CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'];

const FULL_EDIT_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'];
const BILLING_EDIT_ROLES = ['RECEPTIONIST'];

const EMR_SECTIONS: PatientSection[] = [
  'VITAL_SIGNS',
  'CLINICAL_NOTES',
  'VISITS',
  'COMPLETED_PROCEDURES',
  'FILES',
];

// Sections whose content is derived from visits data
const VISIT_DERIVED_SECTIONS: PatientSection[] = [...EMR_SECTIONS, 'INVOICES', 'LEDGER'];

function sectionFromTab(tab: string | null): PatientSection {
  switch (tab) {
    case 'appointments': return 'APPOINTMENTS';
    case 'visits': return 'VISITS';
    case 'treatment-plans': return 'TREATMENT_PLANS';
    case 'timeline': return 'TIMELINE';
    case 'files': return 'FILES';
    case 'prescriptions': return 'PRESCRIPTIONS';
    case 'invoices': return 'INVOICES';
    case 'payments': return 'PAYMENTS';
    case 'ledger': return 'LEDGER';
    case 'vital-signs': return 'VITAL_SIGNS';
    case 'clinical-notes': return 'CLINICAL_NOTES';
    default: return 'PROFILE';
  }
}

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null;
}) => (
  <div className="flex items-start gap-3">
    <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  </div>
);

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionClaims } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeSection, setActiveSection] = useState<PatientSection>(() =>
    sectionFromTab(searchParams.get('tab'))
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'CASH',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [visits, setVisits] = useState<VisitFull[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<EditableVisit | null>(null);
  const [showPatientSidebar, setShowPatientSidebar] = useState(
    () => sectionFromTab(searchParams.get('tab')) !== 'CLINICAL_NOTES'
  );

  const patientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId || '';

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const role = String(sessionClaims?.role || '');
  const canFullEdit = FULL_EDIT_ROLES.includes(role);
  const canBillingEdit = canFullEdit || BILLING_EDIT_ROLES.includes(role);
  const canManageSessions = canFullEdit;

  useEffect(() => {
    const load = async () => {
      try {
        const [patientRes, groupsRes] = await Promise.all([
          fetch(`/api/patients/${patientId}`),
          fetch(`/api/patient-groups?clinicId=${clinicId}`),
        ]);

        const patientData = await patientRes.json();
        const groupsData = await groupsRes.json();

        if (!patientRes.ok) {
          setNotFound(true);
        } else {
          setPatient(patientData.patient);
        }
        setGroups(groupsData.groups || []);
      } catch (error) {
        console.error('Error loading patient:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) load();
  }, [patientId, clinicId]);

  useEffect(() => {
    let cancelled = false;
    const loadPayments = async () => {
      try {
        const res = await fetch(`/api/payments?patientId=${patientId}`);
        const data = await res.json();
        if (!cancelled) setPayments(data.payments || []);
      } catch (error) {
        console.error('Error loading payments:', error);
      }
    };
    if (patientId) loadPayments();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Visits (needed by EMR sections + invoices/ledger)
  useEffect(() => {
    if (!patientId || !VISIT_DERIVED_SECTIONS.includes(activeSection)) return;
    if (visits.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setSectionLoading(true);
      try {
        const res = await fetch(`/api/patients/${patientId}/visits?limit=200`);
        const data = await res.json();
        if (!cancelled) setVisits(data.visits || []);
      } catch (error) {
        console.error('Error loading visits:', error);
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, activeSection, visits.length]);

  // Treatment plans (needed for plans list + completed procedures)
  useEffect(() => {
    if (!patientId || !['TREATMENT_PLANS', 'COMPLETED_PROCEDURES'].includes(activeSection)) return;
    if (plans.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setSectionLoading(true);
      try {
        const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
        const data = await res.json();
        if (!cancelled) setPlans(data.plans || []);
      } catch (error) {
        console.error('Error loading treatment plans:', error);
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, activeSection, plans.length]);

  // Appointments (all-time for this patient)
  useEffect(() => {
    if (!patientId || activeSection !== 'APPOINTMENTS') return;
    let cancelled = false;
    const load = async () => {
      setSectionLoading(true);
      try {
        const res = await fetch(
          `/api/appointments?clinicId=${clinicId}&patientId=${patientId}&startDate=2000-01-01&endDate=2100-01-01`
        );
        const data = await res.json();
        if (!cancelled) setAppointments(data.appointments || []);
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, activeSection, clinicId]);

  // Timeline
  useEffect(() => {
    if (!patientId || activeSection !== 'TIMELINE') return;
    let cancelled = false;
    const load = async () => {
      setSectionLoading(true);
      try {
        const res = await fetch(`/api/patients/${patientId}/timeline`);
        const data = await res.json();
        if (!cancelled) setTimelineEntries(data.entries || []);
      } catch (error) {
        console.error('Error loading timeline:', error);
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, activeSection]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSavingPayment(true);
    setPaymentError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.patientId,
          patientName: patient.name,
          clinicId: patient.registeredClinicId,
          amount: paymentForm.amount,
          mode: paymentForm.mode,
          date: paymentForm.date,
          notes: paymentForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', mode: 'CASH', date: new Date().toISOString().slice(0, 10), notes: '' });
        const payRes = await fetch(`/api/payments?patientId=${patient.patientId}`);
        const payData = await payRes.json();
        setPayments(payData.payments || []);
        const patientRes = await fetch(`/api/patients/${patient.patientId}`);
        const patientData = await patientRes.json();
        if (patientRes.ok) setPatient(patientData.patient);
      } else {
        setPaymentError(data.error || 'Failed to record payment');
      }
    } catch {
      setPaymentError('Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const groupNamesById = groups.reduce<Record<string, string>>((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {});

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  // Completed procedures come from treatment plans (NOT sessions)
  const completedProcedures = useMemo<CompletedProcedure[]>(() => {
    const out: CompletedProcedure[] = [];
    for (const plan of plans) {
      for (const p of plan.procedures || []) {
        if ((p.status || 'PENDING') !== 'COMPLETED') continue;
        out.push({
          planId: plan.planId,
          planTitle: plan.title,
          procedureId: p.procedureId,
          procedureName: p.procedureName,
          toothNumbers: p.toothNumbers ?? null,
          isFullMouth: !!p.isFullMouth,
          qty: p.qty,
          unitCost: p.unitCost,
          cost: p.qty * p.unitCost,
          discount: p.discount,
          total: p.total,
          completedBy: p.completedByName ?? null,
          completedAt: p.completedAt ?? null,
          notes: p.notes ?? null,
        });
      }
    }
    return out;
  }, [plans]);

  const derivedInvoices = useMemo(() => {
    return visits
      .filter((v) => Number(v.treatmentCost || 0) > 0)
      .map((v) => {
        const total = Number(v.treatmentCost || 0);
        const paid = Math.min(Number(v.amountPaid || 0), total);
        return {
          visitId: v.visitId,
          date: v.visitDate,
          label:
            (v.dentalChartEntries && v.dentalChartEntries[0]?.procedureDone) ||
            v.visitType.replace(/_/g, ' '),
          total,
          paid,
          due: Math.max(total - paid, 0),
          status:
            v.paymentStatus ||
            (paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        };
      });
  }, [visits]);

  const allFiles = useMemo(() => {
    const out = [];
    for (const v of visits) {
      for (const f of v.fileIds || []) {
        out.push({ ...f, visitId: v.visitId, uploadedDate: v.visitDate });
      }
    }
    return out.sort(
      (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()
    );
  }, [visits]);

  const genderAge =
    [
      patient ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : '',
      patient?.age != null ? `${patient.age} yrs` : '',
    ]
      .filter(Boolean)
      .join(', ') || '';

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading patient...</div>
    );
  }

  if (notFound || !patient) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Patient not found</p>
        <button
          onClick={() => router.push('/patients')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Patients
        </button>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'PROFILE':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon={Phone} label="Primary Phone" value={patient.primaryPhone} />
                <InfoItem icon={Phone} label="Secondary Phone" value={patient.secondaryPhone} />
                <InfoItem icon={Mail} label="Email" value={patient.email} />
                <InfoItem icon={MapPin} label="Address" value={patient.address
                  ? [patient.address.street, patient.address.locality, patient.address.city, patient.address.pincode].filter(Boolean).join(', ')
                  : null} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                <InfoItem icon={Calendar} label="Anniversary" value={formatDate(patient.anniversary)} />
                <InfoItem icon={Droplet} label="Blood Group" value={patient.bloodGroup} />
                <InfoItem icon={Users} label="Language Preference" value={patient.languagePreference} />
                <InfoItem icon={Tag} label="Referred By" value={patient.referredByName} />
                <InfoItem icon={Stethoscope} label="Primary Doctor" value={patient.primaryDoctorName} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-red-500" /> Medical History
              </h3>
              {patient.medicalHistory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.medicalHistory.map((condition) => (
                    <span key={condition} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full">
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No medical conditions recorded.</p>
              )}
              {patient.otherHistory && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-3">{patient.otherHistory}</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" /> Groups
              </h3>
              {patient.groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.groups.map((g) => (
                    <span key={g} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full">
                      {groupNamesById[g] || g}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No groups assigned.</p>
              )}
            </div>
          </div>
        );

      case 'VITAL_SIGNS':
        return (
          <VitalSignsDisplay
            visits={visits}
            loading={sectionLoading}
            onEdit={canFullEdit ? (v) => setEditingVisit(v) : undefined}
          />
        );

      case 'CLINICAL_NOTES':
        return (
          <ClinicalNoteList
            patientId={patientId}
            clinicId={clinicId}
            doctorId={String(sessionClaims?.userId || '')}
            doctorName={String(sessionClaims?.name || '')}
            userRole={role}
          />
        );

      case 'COMPLETED_PROCEDURES':
        return (
          <PatientCompletedProcedures
            procedures={completedProcedures}
            loading={sectionLoading}
          />
        );      case 'FILES':
        return (
          <PatientFiles
            patientId={patientId}
            clinicId={clinicId}
            visits={visits.map((v) => ({
              visitId: v.visitId,
              visitDate: v.visitDate,
              label: `${new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${v.visitType?.replace(/_/g, ' ')}`,
            }))}
            legacyFiles={allFiles}
            loading={sectionLoading}
            canUpload={canBillingEdit}
            canDelete={canFullEdit}
          />
        );

      case 'PRESCRIPTIONS':
        return (
          <PatientPrescriptions
            patientId={patientId}
            clinicId={clinicId}
            patientName={patient.name}
            canEdit={canFullEdit}
          />
        );

      case 'TIMELINE':
        return <PatientTimeline entries={timelineEntries} loading={sectionLoading} />;

      case 'APPOINTMENTS':
        return (
          <PatientAppointments
            appointments={appointments}
            loading={sectionLoading}
            onAdd={() => setShowAppointmentModal(true)}
          />
        );

      case 'TREATMENT_PLANS':
        return (
          <PatientTreatmentPlans plans={plans} loading={sectionLoading} patientId={patientId} />
        );

      case 'VISITS':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-500" /> Visits (Sessions)
              </h3>
              {canManageSessions && (
                <button
                  onClick={() => router.push(`/patients/${patientId}/visits/new`)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" /> New Session
                </button>
              )}
            </div>
            {sectionLoading ? (
              <p className="text-sm text-gray-500">Loading visits...</p>
            ) : visits.length === 0 ? (
              <p className="text-sm text-gray-500">No visits recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Complaint</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visits.map((v) => (
                      <tr key={v.visitId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(v.visitDate)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{v.visitType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">{v.chiefComplaint || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            v.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            v.paymentStatus === 'PAID'
                              ? 'bg-green-100 text-green-700'
                              : v.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {(v.paymentStatus || 'UNPAID').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/patients/${patientId}/visits/${v.visitId}/view`)}
                              className="px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
                            >
                              View Session
                            </button>
                            {v.status !== 'COMPLETED' && canBillingEdit && (
                              <button
                                onClick={() => router.push(`/patients/${patientId}/visits/${v.visitId}/edit`)}
                                className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                              >
                                {canFullEdit ? 'Edit' : 'Edit Billing'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'INVOICES':
        return <PatientRealInvoices patientId={patientId} />;

      case 'PAYMENTS':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">All Payments</h3>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Record Payment
              </button>
            </div>
            <PatientPaymentsSection payments={payments} loading={false} />
          </div>
        );

      case 'LEDGER':
        return (
          <PatientLedger
            patient={patient}
            summary={{
              totalInvoiced: derivedInvoices.reduce((s, i) => s + i.total, 0),
              totalPaid: Number(patient.totalPaid || 0),
              balanceDue: Number(patient.totalDue || 0),
            }}
            loading={sectionLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/patients')}
          className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back to Patients
        </button>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{patient.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                  <span className="text-xs sm:text-sm text-gray-500 truncate">{patient.patientId}</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full flex-shrink-0 ${
                      patient.gender === 'MALE'
                        ? 'bg-blue-100 text-blue-800'
                        : patient.gender === 'FEMALE'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {patient.gender}
                  </span>
                  {patient.age !== null && (
                    <span className="text-xs sm:text-sm text-gray-500">• {patient.age} yrs</span>
                  )}
                  <button
                    onClick={() => setShowEditModal(true)}
                    title="Edit patient details"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              </div>
            </div>
            <div className="sm:text-right w-full sm:w-auto bg-gray-50 sm:bg-transparent rounded-lg p-3 sm:p-0">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide sm:normal-case">Financial Summary</p>
              <div className="mt-1 grid grid-cols-3 sm:block gap-2 sm:space-y-0.5 text-xs sm:text-sm">
                <p className="text-center sm:text-right">
                  <span className="block sm:inline text-gray-500 text-[10px] sm:text-sm">Advance</span>{' '}
                  <span className="font-semibold text-green-600 block sm:inline">
                    ₹{Number(patient.advanceBalance || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-center sm:text-right">
                  <span className="block sm:inline text-gray-500 text-[10px] sm:text-sm">Paid</span>{' '}
                  <span className="font-semibold text-blue-600 block sm:inline">
                    ₹{Number(patient.totalPaid || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-center sm:text-right">
                  <span className="block sm:inline text-gray-500 text-[10px] sm:text-sm">Due</span>{' '}
                  <span className="font-semibold text-red-600 block sm:inline">
                    ₹{Number(patient.totalDue || 0).toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="mt-3 flex gap-2 sm:justify-end">
                {canBillingEdit && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 text-center justify-center"
                  >
                    Record Payment
                  </button>
                )}
                {canManageSessions && (
                  <button
                    onClick={() => router.push(`/patients/${patientId}/visits/new`)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 sm:px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">New Session</span><span className="xs:hidden">New</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {patient.lastVisitDate && (
            <p className="text-xs sm:text-sm text-gray-500 mt-3">
              Last visit: {formatDate(patient.lastVisitDate)}
            </p>
          )}
        </div>
      </div>

      {/* Sidebar + Section content */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
        {showPatientSidebar && (
          <PatientSidebar
            patientName={patient.name}
            patientId={patient.patientId}
            genderAge={genderAge}
            activeSection={activeSection}
            onSectionChange={(s) => {
              setActiveSection(s);
              if (s === 'CLINICAL_NOTES') {
                setShowPatientSidebar(false);
              }
            }}
            onClose={() => setShowPatientSidebar(false)}
          />
        )}

        <div className="flex-1 min-w-0 w-full bg-white rounded-lg shadow p-4 sm:p-6 min-h-[300px] overflow-hidden relative">
          {!showPatientSidebar && (
            <button
              onClick={() => setShowPatientSidebar(true)}
              className="absolute top-3 left-3 z-10 p-2 bg-white rounded-md shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Show patient menu"
              title="Show patient menu"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          )}
          {renderSection()}
        </div>
      </div>

      {/* Visit Edit Modal (vitals / clinical notes) */}
      {editingVisit && (
        <VisitEditModal
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSaved={(updated) => {
            const u = updated as Record<string, unknown>;
            setVisits((prev) =>
              prev.map((v) =>
                v.visitId === (u.visitId as string)
                  ? {
                      ...v,
                      chiefComplaint: (u.chiefComplaint as string | null) ?? null,
                      diagnosis: (u.diagnosis as string | null) ?? null,
                      treatmentGiven: (u.treatmentGiven as string | null) ?? null,
                      additionalNotes: (u.additionalNotes as string | null) ?? null,
                      injectionGiven: Boolean(u.injectionGiven),
                      vitalSigns: (u.vitalSigns as VisitFull['vitalSigns']) ?? null,
                    }
                  : v
              )
            );
            setEditingVisit(null);
          }}
        />
      )}

      {/* Edit Patient Modal */}
      {showEditModal && (
        <PatientProfileEdit
          patient={patient as unknown as EditablePatient}
          clinicId={clinicId}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setPatient(updated as unknown as Patient);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Add Appointment Modal */}
      {showAppointmentModal && (
        <AppointmentModal
          onClose={() => setShowAppointmentModal(false)}
          onSave={() => {
            setShowAppointmentModal(false);
            if (activeSection === 'APPOINTMENTS') {
              setSectionLoading(true);
              fetch(
                `/api/appointments?clinicId=${clinicId}&patientId=${patientId}&startDate=2000-01-01&endDate=2100-01-01`
              )
                .then((r) => r.json())
                .then((d) => setAppointments(d.appointments || []))
                .finally(() => setSectionLoading(false));
            }
          }}
          clinicId={clinicId}
          doctors={[]}
          prefill={{
            patient: { patientId: patient.patientId, name: patient.name },
          }}
        />
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <form onSubmit={handleSavePayment} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
              {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
