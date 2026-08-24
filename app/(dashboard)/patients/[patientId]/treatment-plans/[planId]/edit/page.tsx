'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TreatmentPlanForm } from '@/components/plans/TreatmentPlanForm';

interface Patient {
  patientId: string;
  name: string;
  registeredClinicId: string;
}

interface Plan {
  planId: string;
  title: string | null;
  status: string;
  procedures: {
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
  }[];
  notes: string | null;
  shareEnabled: boolean;
}

export default function EditTreatmentPlanPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId || '';
  const clinicId = patient?.registeredClinicId || 'clinic_a';

  useEffect(() => {
    const load = async () => {
      try {
        const [patientRes, planRes] = await Promise.all([
          fetch(`/api/patients/${patientId}`),
          fetch(`/api/treatment-plans/${planId}`),
        ]);
        const patientData = await patientRes.json();
        const planData = await planRes.json();
        if (patientRes.ok) setPatient(patientData.patient);
        if (planRes.ok) setPlan(planData.plan);
        else setNotFound(true);
      } catch (error) {
        console.error('Error loading treatment plan:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (patientId && planId) load();
  }, [patientId, planId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (notFound || !patient || !plan) {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=treatment-plans`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Treatment Plan — {patient.name}</h1>
        <p className="text-sm text-gray-500">{plan.planId}</p>
      </div>

      <TreatmentPlanForm
        patientId={patient.patientId}
        clinicId={clinicId}
        planId={planId}
        initial={plan}
      />
    </div>
  );
}