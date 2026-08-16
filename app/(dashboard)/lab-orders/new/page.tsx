'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2 } from 'lucide-react';

interface Lab {
  labId: string;
  name: string;
  address: string | null;
}

interface PatientResult {
  patientId: string;
  name: string;
  primaryPhone: string;
}

interface Stage {
  stageName: string;
  description: string;
  deadline: string;
}

export default function NewLabOrderPage() {
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  const [form, setForm] = useState({
    labId: '',
    visitId: '',
    workDescription: '',
    overallDueDate: '',
    stages: [{ stageName: '', description: '', deadline: '' }],
  });

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/labs?active=true');
        const data = await res.json();
        if (!cancelled) setLabs(data.labs || []);
      } catch (error) {
        console.error('Error fetching labs:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearchPatient = async () => {
    if (searchPatient.length < 2) return;
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  useEffect(() => {
    if (searchPatient.length < 2) return;
    const t = setTimeout(() => {
      const search = async () => {
        try {
          const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
          const data = await res.json();
          setPatients(data.patients || []);
        } catch (error) {
          console.error('Error searching patients:', error);
        }
      };
      search();
    }, 300);
    return () => clearTimeout(t);
  }, [searchPatient]);

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setSearchPatient('');
    setPatients([]);
  };

  const updateStage = (index: number, field: keyof Stage, value: string) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const addStage = () => {
    setForm((f) => ({
      ...f,
      stages: [...f.stages, { stageName: '', description: '', deadline: '' }],
    }));
  };

  const removeStage = (index: number) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selectedLab = labs.find((l) => l.labId === form.labId);

    if (!selectedPatient || !form.labId || !form.workDescription) {
      alert('Please select a patient, lab, and enter work description');
      setLoading(false);
      return;
    }

    const validStages = form.stages.filter((s) => s.stageName.trim());
    if (validStages.length === 0) {
      alert('Please add at least one stage');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        labId: form.labId,
        labName: selectedLab?.name || '',
        clinicId,
        patientId: selectedPatient.patientId,
        patientName: selectedPatient.name,
        visitId: form.visitId || null,
        workDescription: form.workDescription,
        overallDueDate: form.overallDueDate || null,
        stages: validStages,
      };

      const res = await fetch('/api/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/lab-orders/${data.orderId}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create lab order');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Lab Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient *</label>
          <div className="mt-1 relative">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSearchPatient}
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {patients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {patients.map((p) => (
                  <button
                    key={p.patientId}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    {p.name} ({p.patientId}) - {p.primaryPhone}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPatient && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <span className="font-medium">{selectedPatient.name}</span>
              <span className="text-sm text-gray-500 ml-2">({selectedPatient.patientId})</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Lab *</label>
            <select
              required
              value={form.labId}
              onChange={(e) => setForm({ ...form, labId: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Lab</option>
              {labs.map((lab) => (
                <option key={lab.labId} value={lab.labId}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Overall Due Date</label>
            <input
              type="date"
              value={form.overallDueDate}
              onChange={(e) => setForm({ ...form, overallDueDate: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Visit ID</label>
          <input
            type="text"
            value={form.visitId}
            onChange={(e) => setForm({ ...form, visitId: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Work Description *</label>
          <textarea
            required
            value={form.workDescription}
            onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Describe the lab work required..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Stages</label>
            <button
              type="button"
              onClick={addStage}
              className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Stage
            </button>
          </div>
          <div className="space-y-3">
            {form.stages.map((stage, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Stage {index + 1}</span>
                  {form.stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Stage name *"
                    required={index === 0}
                    value={stage.stageName}
                    onChange={(e) => updateStage(index, 'stageName', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="date"
                    placeholder="Deadline"
                    value={stage.deadline}
                    onChange={(e) => updateStage(index, 'deadline', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description"
                  value={stage.description}
                  onChange={(e) => updateStage(index, 'description', e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Lab Order'}
          </button>
        </div>
      </form>
    </div>
  );
}