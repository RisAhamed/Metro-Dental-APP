'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState<{ labId: string; name: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'GENERAL_DOCTOR',
    primaryClinicId: 'clinic_a',
    clinicIds: ['clinic_a'],
    labId: '',
  });

  useEffect(() => {
    const loadLabs = async () => {
      try {
        const res = await fetch('/api/labs?active=true');
        const data = await res.json();
        setLabs(data.labs || []);
      } catch (error) {
        console.error('Error fetching labs:', error);
      }
    };
    loadLabs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.role === 'LAB_TECHNICIAN' && !form.labId) {
      alert('Please select a lab for the Lab Technician');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`User created with temp password: ${data.tempPassword}`);
        router.push('/admin/users');
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New User</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email *</label>
          <input
            type="email"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Role *</label>
          <select
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="CLINIC_ADMIN">Clinic Admin</option>
            <option value="GENERAL_DOCTOR">General Doctor</option>
            <option value="ASSISTANT_DOCTOR">Assistant Doctor</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="LAB_TECHNICIAN">Lab Technician</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </div>
        {form.role === 'LAB_TECHNICIAN' && (
          <div>
            <label className="block text-sm font-medium">Lab *</label>
            <select
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              value={form.labId}
              onChange={(e) => setForm({ ...form, labId: e.target.value })}
            >
              <option value="">Select Lab</option>
              {labs.map((lab) => (
                <option key={lab.labId} value={lab.labId}>
                  {lab.name} ({lab.labId})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Primary Clinic</label>
          <select
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.primaryClinicId}
            onChange={(e) => setForm({ ...form, primaryClinicId: e.target.value })}
          >
            <option value="clinic_a">Clinic A</option>
            <option value="clinic_b">Clinic B</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Assigned Clinics (comma separated)</label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={form.clinicIds.join(', ')}
            onChange={(e) => setForm({ ...form, clinicIds: e.target.value.split(',').map((s) => s.trim()) })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
}
