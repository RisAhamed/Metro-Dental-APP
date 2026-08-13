'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
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

const TABS = ['Overview', 'Medical History', 'Groups'];

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
  const { sessionClaims } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const patientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId || '';

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

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
      </div>
    </div>
  );
}
