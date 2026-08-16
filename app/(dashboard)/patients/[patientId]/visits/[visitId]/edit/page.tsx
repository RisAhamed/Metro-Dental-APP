'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { VisitForm } from '@/components/visits/VisitForm';

const FULL_EDIT_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'];
const BILLING_EDIT_ROLES = ['RECEPTIONIST'];

interface Patient {
  patientId: string;
  name: string;
  registeredClinicId: string;
}

interface Visit {
  visitId: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  injectionGiven: boolean;
  doctorsInvolved: { doctorId: string; doctorName: string; role: string }[];
  dentalChartEntries: { region: string; toothNumber: string; procedureDone: string; notes: string | null }[];
  vitalSigns: { age: number | null; weight: number | null; bloodPressure: string | null; bloodSugar: number | null; pulseRate: number | null; spo2: number | null } | null;
  treatmentCost: string;
  amountPaid: string;
  paymentStatus: string;
  payments: { paymentId: string; amount: number; mode: string; notes: string | null; date: string; recordedBy: string; recordedByName: string | null }[];
  fileIds: { fileId: string; fileName: string; url: string; type?: string }[];
  additionalNotes: string | null;
  nextVisitDate: string | null;
  status: string;
}

export default function EditVisitPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const visitId = Array.isArray(params.visitId) ? params.visitId[0] : params.visitId || '';
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  const role = String(sessionClaims?.role || '');
  const canFullEdit = FULL_EDIT_ROLES.includes(role);
  const canBillingEdit = canFullEdit || BILLING_EDIT_ROLES.includes(role);
  const noAccess = !canFullEdit && !canBillingEdit;

  useEffect(() => {
    const load = async () => {
      try {
        const [patientRes, visitRes] = await Promise.all([
          fetch(`/api/patients/${patientId}`),
          fetch(`/api/visits/${visitId}`),
        ]);
        const patientData = await patientRes.json();
        const visitData = await visitRes.json();
        if (patientRes.ok) setPatient(patientData.patient);
        if (visitRes.ok) setVisit(visitData.visit);
        else setNotFound(true);
      } catch (error) {
        console.error('Error loading visit:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (patientId && visitId) load();
  }, [patientId, visitId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (noAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">You do not have permission to edit sessions.</p>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  if (notFound || !patient || !visit) {
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
      <h1 className="text-2xl font-bold text-gray-900">
        {visit.status === 'COMPLETED' ? 'View Session' : canFullEdit ? 'Edit Session' : 'Edit Billing'} — {patient.name}
      </h1>
        <p className="text-sm text-gray-500">{visit.visitId}</p>
        {!canFullEdit && visit.status !== 'COMPLETED' && (
          <p className="text-sm text-amber-600 mt-1">
            You can edit billing/payment fields only. Clinical fields are locked.
          </p>
        )}
      </div>

      <VisitForm
        patientId={patient.patientId}
        patientName={patient.name}
        clinicId={clinicId}
        visitId={visitId}
        initial={visit}
        readOnly={visit.status === 'COMPLETED'}
      />
    </div>
  );
}