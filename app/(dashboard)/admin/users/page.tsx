'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clinicName } from '@/lib/constants/clinics';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  primaryClinicId: string | null;
  clinicIds: string[];
  isActive: boolean;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  primaryClinicId: string;
  clinicIds: string[];
  isActive: boolean;
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'CLINIC_ADMIN', label: 'Clinic Admin' },
  { value: 'GENERAL_DOCTOR', label: 'General Doctor' },
  { value: 'ASSISTANT_DOCTOR', label: 'Assistant Doctor' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'VENDOR', label: 'Vendor' },
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (!cancelled) setUsers(data.users || []);
      } catch {
        if (!cancelled) setError('Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openEdit = async (user: UserRow) => {
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setEditing(user);
        setForm({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          role: data.user.role,
          primaryClinicId: data.user.primaryClinicId || '',
          clinicIds: data.user.clinicIds || [],
          isActive: data.user.isActive,
        });
      } else {
        setError(data.error || 'Failed to load user');
      }
    } catch {
      setError('Failed to load user');
    }
  };

  const closeModal = () => {
    setEditing(null);
    setForm(null);
    setError('');
  };

  const toggleClinic = (clinicId: string) => {
    if (!form) return;
    const has = form.clinicIds.includes(clinicId);
    const next = has ? form.clinicIds.filter((c) => c !== clinicId) : [...form.clinicIds, clinicId];
    setForm({
      ...form,
      clinicIds: next,
      primaryClinicId: has && form.primaryClinicId === clinicId ? '' : form.primaryClinicId,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form) return;
    if (form.clinicIds.length === 0) {
      setError('Assign at least one clinic');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          primaryClinicId: form.primaryClinicId || null,
          clinicIds: form.clinicIds,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        loadUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: UserRow) => {
    if (!window.confirm(`Deactivate ${user.name}? They will be signed out and blocked from logging in.`)) {
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        loadUsers();
      } else {
        setError(data.error || 'Failed to deactivate user');
      }
    } catch {
      setError('Failed to deactivate user');
    }
  };

  const handleReactivate = async (user: UserRow) => {
    if (!window.confirm(`Reactivate ${user.name}?`)) return;
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          primaryClinicId: user.primaryClinicId || null,
          clinicIds: user.clinicIds,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        loadUsers();
      } else {
        setError(data.error || 'Failed to reactivate user');
      }
    } catch {
      setError('Failed to reactivate user');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => router.push('/admin/users/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clinicName(user.primaryClinicId)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  {user.isActive ? (
                    <button
                      onClick={() => handleDeactivate(user)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(user)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Edit User</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                  value={form.email}
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Clinic</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.primaryClinicId}
                  onChange={(e) => setForm({ ...form, primaryClinicId: e.target.value })}
                >
                  <option value="">All Clinics (Super Admin)</option>
                  <option value="clinic_a">Clinic A</option>
                  <option value="clinic_b">Clinic B</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Clinics</label>
                <div className="flex gap-4">
                  {['clinic_a', 'clinic_b'].map((clinicId) => (
                    <label key={clinicId} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.clinicIds.includes(clinicId)}
                        onChange={() => toggleClinic(clinicId)}
                        className="h-4 w-4"
                      />
                      {clinicName(clinicId)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
