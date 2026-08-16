'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { VisitForm } from '@/components/visits/VisitForm';

interface Patient {
  patientId: string;
  name: string;
  registeredClinicId: string;
}

export default function NewVisitPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId || '';
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        const data = await res.json();
        if (res.ok) setPatient(data.patient);
      } catch (error) {
        console.error('Error loading patient:', error);
      } finally {
        setLoading(false);
      }
    };
    if (patientId) load();
  }, [patientId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!patient) {
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
      <div>
        <button
          onClick={() => router.push(`/patients/${patientId}/profile?tab=visits`)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Session — {patient.name}</h1>
        <p className="text-sm text-gray-500">{patient.patientId}</p>
      </div>

      <VisitForm
        patientId={patient.patientId}
        patientName={patient.name}
        clinicId={clinicId}
      />
    </div>
  );
}