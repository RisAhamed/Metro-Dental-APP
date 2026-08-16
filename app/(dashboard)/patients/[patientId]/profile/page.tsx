'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  DollarSign,
  ClipboardList,
  Activity,
  Plus,
  type LucideIcon,
} from 'lucide-react';

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
  referredById: string | null;
  referredByName: string | null;
  medicalHistory: string[];
  otherHistory: string | null;
  groups: string[];
  languagePreference: string | null;
  primaryDoctorId: string | null;
  primaryDoctorName: string | null;
  registeredClinicId: string;
  advanceBalance: string;
  totalDue: string;
  totalPaid: string;
  lastVisitDate: string | null;
  createdAt: string;
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

interface Visit {
  visitId: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string | null;
  treatmentCost: string;
  amountPaid: string;
  paymentStatus: string;
  status: string;
}

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  grandTotal: string;
  createdAt: string;
}

const PAYMENT_MODES = ['CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'];

const FULL_EDIT_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'];
const BILLING_EDIT_ROLES = ['RECEPTIONIST'];

const TABS = ['Overview', 'Medical History', 'Groups', 'Payments', 'Visits', 'Treatment Plans'];

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === 'visits') return 'Visits';
    if (tab === 'treatment-plans') return 'Treatment Plans';
    return 'Overview';
  });
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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);

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

  useEffect(() => {
    if (!patientId || activeTab === 'Overview') return;
    let cancelled = false;
    const loadClinical = async () => {
      setClinicalLoading(true);
      try {
        if (activeTab === 'Visits') {
          const res = await fetch(`/api/patients/${patientId}/visits`);
          const data = await res.json();
          if (!cancelled) setVisits(data.visits || []);
        }
        if (activeTab === 'Treatment Plans') {
          const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
          const data = await res.json();
          if (!cancelled) setPlans(data.plans || []);
        }
      } catch (error) {
        console.error('Error loading clinical data:', error);
      } finally {
        if (!cancelled) setClinicalLoading(false);
      }
    };
    loadClinical();
    return () => {
      cancelled = true;
    };
  }, [patientId, activeTab]);

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/patients')}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{patient.patientId}</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
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
                    <span className="text-sm text-gray-500">• {patient.age} yrs</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Financial Summary</p>
              <div className="mt-1 space-y-0.5 text-sm">
                <p>
                  <span className="text-gray-500">Advance:</span>{' '}
                  <span className="font-semibold text-green-600">
                    ₹{Number(patient.advanceBalance || 0).toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Total Paid:</span>{' '}
                  <span className="font-semibold text-blue-600">
                    ₹{Number(patient.totalPaid || 0).toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Total Due:</span>{' '}
                  <span className="font-semibold text-red-600">
                    ₹{Number(patient.totalDue || 0).toFixed(2)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Record Payment
              </button>
              {canManageSessions && (
                <button
                  onClick={() => router.push(`/patients/${patientId}/visits/new`)}
                  className="mt-3 ml-2 flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" /> New Session
                </button>
              )}
            </div>
          </div>

          {patient.lastVisitDate && (
            <p className="text-sm text-gray-500 mt-3">
              Last visit: {formatDate(patient.lastVisitDate)}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-white text-blue-700 border border-b-0 border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
        {activeTab === 'Overview' && (
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
          </div>
        )}

        {activeTab === 'Medical History' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-red-500" /> Conditions
              </h3>
              {patient.medicalHistory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.medicalHistory.map((condition) => (
                    <span
                      key={condition}
                      className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No medical conditions recorded.</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Other History</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {patient.otherHistory || 'No other history recorded.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'Groups' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-500" /> Assigned Groups
            </h3>
            {patient.groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.groups.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
                  >
                    {groupNamesById[g] || g}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No groups assigned.</p>
            )}
          </div>
        )}

        {activeTab === 'Payments' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" /> Payment History
            </h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p.paymentId}>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(p.date)}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          ₹{Number(p.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.mode}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.recordedByName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'Visits' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" /> Visits (Sessions)
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
            {clinicalLoading ? (
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
                            {v.paymentStatus.replace(/_/g, ' ')}
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
        )}

        {activeTab === 'Treatment Plans' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-500" /> Treatment Plans
              </h3>
              <button
                onClick={() => router.push(`/patients/${patientId}/treatment-plans/new`)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" /> New Treatment Plan
              </button>
            </div>
            {clinicalLoading ? (
              <p className="text-sm text-gray-500">Loading treatment plans...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-500">No treatment plans yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plans.map((p) => (
                      <tr key={p.planId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">{p.title || 'Untitled Plan'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            p.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : p.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          ₹{Number(p.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => router.push(`/patients/${patientId}/treatment-plans/${p.planId}`)}
                            className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
