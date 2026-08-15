'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Pencil, Trash2, X, Phone, Mail } from 'lucide-react';

interface Vendor {
  vendorId: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  clinicId: string;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '',
  address: '',
  phone: '',
  email: '',
  contactPerson: '',
};

export default function VendorsManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/vendors?active=true');
        const data = await res.json();
        if (!cancelled) setVendors(data.vendors || []);
      } catch (error) {
        console.error('Error loading vendors:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadVendors = async () => {
    try {
      const res = await fetch('/api/vendors?active=true');
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor.name,
      address: vendor.address || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      contactPerson: vendor.contactPerson || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/vendors/${editing.vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          phone: form.phone,
          email: form.email,
          contactPerson: form.contactPerson,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update vendor');
        setSaving(false);
        return;
      }
      setShowModal(false);
      await loadVendors();
    } catch (err) {
      console.error('Vendor save error:', err);
      setError('Failed to save vendor');
      setSaving(false);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Deactivate vendor "${vendor.name}"?`)) return;
    const res = await fetch(`/api/vendors/${vendor.vendorId}`, { method: 'DELETE' });
    if (res.ok) await loadVendors();
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Vendors</h2>
          <p className="text-sm text-gray-600 mt-1">
            Suppliers you place purchase orders with.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No vendors yet. Create a user with the VENDOR role to add a vendor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vendors.map((vendor) => (
            <div key={vendor.vendorId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  {vendor.clinicId && (
                    <p className="text-sm text-gray-500">
                      Delivers to:{' '}
                      {vendor.clinicId === 'shared'
                        ? 'All clinics'
                        : vendor.clinicId === 'clinic_a'
                        ? 'Clinic A'
                        : vendor.clinicId === 'clinic_b'
                        ? 'Clinic B'
                        : vendor.clinicId}
                    </p>
                  )}
                  {vendor.contactPerson && (
                    <p className="text-sm text-gray-500">Contact: {vendor.contactPerson}</p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" /> {vendor.phone}
                    </p>
                  )}
                  {vendor.email && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {vendor.email}
                    </p>
                  )}
                  {vendor.address && (
                    <p className="text-sm text-gray-500 mt-1">{vendor.address}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(vendor)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vendor)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Vendor</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={`${inputClass} min-h-[60px]`}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
