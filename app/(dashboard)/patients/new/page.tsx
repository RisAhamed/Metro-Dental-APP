'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface GroupOption {
  id: string;
  name: string;
}

export default function NewPatientPage() {
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  const [form, setForm] = useState({
    patientId: '',
    name: '',
    gender: 'MALE',
    dateOfBirth: '',
    age: '',
    bloodGroup: '',
    primaryPhone: '',
    secondaryPhone: '',
    email: '',
    anniversary: '',
    street: '',
    locality: '',
    city: '',
    pincode: '',
    referredById: '',
    referredByName: '',
    medicalHistory: [] as string[],
    otherHistory: '',
    groups: [] as string[],
    languagePreference: 'English',
    primaryDoctorId: '',
    primaryDoctorName: '',
  });

  const [availableGroups, setAvailableGroups] = useState<GroupOption[]>([]);
  const [availableMedicalHistory, setAvailableMedicalHistory] = useState<string[]>([]);
  const [availableReferralSources, setAvailableReferralSources] = useState<string[]>([]);

  const generatePatientId = async () => {
    setGeneratingId(true);
    try {
      const res = await fetch('/api/patients/generate-id');
      const data = await res.json();
      if (data.patientId) {
        setForm((prev) => ({ ...prev, patientId: data.patientId }));
      }
    } catch (error) {
      console.error('Error generating patient ID:', error);
    } finally {
      setGeneratingId(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [groupsRes, conditionsRes, sourcesRes] = await Promise.all([
        fetch(`/api/patient-groups?clinicId=${clinicId}`),
        fetch('/api/medical-conditions'),
        fetch('/api/referral-sources'),
      ]);

      const groupsData = await groupsRes.json();
      const conditionsData = await conditionsRes.json();
      const sourcesData = await sourcesRes.json();

      setAvailableGroups(groupsData.groups || []);
      setAvailableMedicalHistory(
        (conditionsData.conditions || []).map((c: { name: string }) => c.name)
      );
      setAvailableReferralSources(
        (sourcesData.sources || []).map((s: { name: string }) => s.name)
      );
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  // Generate patient ID and load options on mount
  useEffect(() => {
    const init = async () => {
      await generatePatientId();
      await fetchOptions();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addReferralSource = async () => {
    const name = prompt('Enter new referral source name:');
    if (!name) return;
    const res = await fetch('/api/referral-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setAvailableReferralSources((prev) => [...prev, name]);
      setForm((prev) => ({ ...prev, referredByName: name }));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to add referral source');
    }
  };

  const addMedicalCondition = async () => {
    const name = prompt('Enter new medical condition:');
    if (!name) return;
    const res = await fetch('/api/medical-conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setAvailableMedicalHistory((prev) => [...prev, name]);
      setForm((prev) => ({ ...prev, medicalHistory: [...prev.medicalHistory, name] }));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to add medical condition');
    }
  };

  const addGroup = async () => {
    const name = prompt('Enter new group name:');
    if (!name) return;
    const res = await fetch('/api/patient-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, clinicId }),
    });
    if (res.ok) {
      const data = await res.json();
      setAvailableGroups((prev) => [...prev, data.group]);
      setForm((prev) => ({ ...prev, groups: [...prev.groups, data.group.id] }));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to add group');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
        dateOfBirth: form.dateOfBirth || null,
        anniversary: form.anniversary || null,
        address: {
          street: form.street,
          locality: form.locality,
          city: form.city,
          pincode: form.pincode,
        },
        registeredClinicId: clinicId,
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/patients/${data.patientId}/profile`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create patient');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMedicalHistory = (condition: string) => {
    setForm((prev) => ({
      ...prev,
      medicalHistory: prev.medicalHistory.includes(condition)
        ? prev.medicalHistory.filter((c) => c !== condition)
        : [...prev.medicalHistory, condition],
    }));
  };

  const toggleGroup = (group: string) => {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group],
    }));
  };

  const inputClass =
    'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Patient Registration</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient ID & Name */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Patient ID</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={form.patientId}
                  readOnly
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={generatePatientId}
                  className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                  disabled={generatingId}
                >
                  {generatingId ? 'Generating...' : 'Regenerate'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Patient Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className={inputClass}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Or Age</label>
              <input
                type="number"
                min="0"
                max="130"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className={inputClass}
                placeholder="Enter age if DOB not known"
              />
            </div>
            <div>
              <label className={labelClass}>Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Blood Group</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Anniversary</label>
            <input
              type="date"
              value={form.anniversary}
              onChange={(e) => setForm({ ...form, anniversary: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Referral */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium text-gray-700 mb-4">Referral</h3>
          <div>
            <label className={labelClass}>Referred By</label>
            <div className="mt-1 flex gap-2">
              <select
                value={form.referredByName}
                onChange={(e) => {
                  const selected = e.target.value;
                  const source = availableReferralSources.find((s) => s === selected);
                  setForm((prev) => ({
                    ...prev,
                    referredByName: selected,
                    referredById: source || selected,
                  }));
                }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {availableReferralSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addReferralSource}
                className="text-sm text-blue-600 hover:underline whitespace-nowrap self-center"
              >
                + Add New
              </button>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium text-gray-700 mb-4">Contact Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Mobile No. *</label>
              <input
                type="tel"
                required
                value={form.primaryPhone}
                onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Secondary Mobile No.</label>
              <input
                type="tel"
                value={form.secondaryPhone}
                onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Language Preference</label>
              <select
                value={form.languagePreference}
                onChange={(e) => setForm({ ...form, languagePreference: e.target.value })}
                className={inputClass}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Telugu">Telugu</option>
                <option value="Kannada">Kannada</option>
                <option value="Bengali">Bengali</option>
                <option value="Marathi">Marathi</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Odia">Odia</option>
                <option value="Assamese">Assamese</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass}>Street Address</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Locality</label>
                <input
                  type="text"
                  value={form.locality}
                  onChange={(e) => setForm({ ...form, locality: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium text-gray-700 mb-4">Medical History</h3>
          {availableMedicalHistory.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {availableMedicalHistory.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => toggleMedicalHistory(condition)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    form.medicalHistory.includes(condition)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addMedicalCondition}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add New
          </button>

          <div className="mt-4">
            <label className={labelClass}>Other History</label>
            <textarea
              value={form.otherHistory}
              onChange={(e) => setForm({ ...form, otherHistory: e.target.value })}
              rows={3}
              className={inputClass}
              placeholder="Any other medical history details..."
            />
          </div>
        </div>

        {/* Groups */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium text-gray-700 mb-4">Groups</h3>
          {availableGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    form.groups.includes(group.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addGroup}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            + Add New Group
          </button>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/patients')}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
