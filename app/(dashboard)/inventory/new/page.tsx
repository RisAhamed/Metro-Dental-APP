'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { inventoryUnits } from '@/lib/constants/inventoryUnits';
import { clinics, clinicName } from '@/lib/constants/clinics';

interface Vendor {
  vendorId: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  unit: string;
}

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const [userInfo, setUserInfo] = useState({
    role: '',
    primaryClinicId: 'clinic_a',
  });

  const isSuperAdmin = userInfo.role === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(userInfo.role);

  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: '',
    quantityInStock: '0',
    reorderLevel: '10',
    unitPrice: '',
    vendorId: '',
    clinicId: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const meRes = await fetch('/api/users/me');
        const meData = await meRes.json();
        if (!cancelled) {
          const role = meData?.user?.role || '';
          const clinic = meData?.user?.primaryClinicId || 'clinic_a';
          setUserInfo({ role, primaryClinicId: clinic });
          setForm((f) => ({ ...f, clinicId: clinic }));
          setLoadingUser(false);
        }
        const catRes = await fetch('/api/inventory/categories');
        const catData = await catRes.json();
        if (!cancelled) {
          setCategories(catData.categories || []);
          if ((catData.categories || []).length > 0) {
            setForm((f) => ({
              ...f,
              category: catData.categories[0].name,
              unit: catData.categories[0].unit,
            }));
          }
        }
        if (meData?.user?.role === 'SUPER_ADMIN' || meData?.user?.role === 'CLINIC_ADMIN') {
          const vendorRes = await fetch('/api/vendors?active=true');
          const vendorData = await vendorRes.json();
          if (!cancelled) setVendors(vendorData.vendors || []);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        if (!cancelled) {
          setForm((f) => ({ ...f, clinicId: 'clinic_a' }));
          setLoadingUser(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategoryChange = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    setForm((f) => ({
      ...f,
      category: name,
      unit: cat?.unit || f.unit,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          unit: form.unit,
          quantityInStock: Number(form.quantityInStock) || 0,
          reorderLevel: Number(form.reorderLevel) || 10,
          unitPrice: isAdmin ? Number(form.unitPrice) || 0 : 0,
          vendorId: isAdmin ? form.vendorId || null : null,
          clinicId: form.clinicId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create item');
        setSaving(false);
        return;
      }
      router.push('/inventory');
    } catch (err) {
      console.error('Create item error:', err);
      setError('Failed to create item');
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loadingUser) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Inventory Item</h1>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
          {isSuperAdmin ? (
            <select
              required
              value={form.clinicId}
              onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
              className={inputClass}
            >
              <option value="">Select clinic</option>
              {clinics.map((c) => (
                <option key={c.clinicId} value={c.clinicId}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              disabled
              value={clinicName(form.clinicId || userInfo.primaryClinicId)}
              className={`${inputClass} bg-gray-50`}
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="e.g. Nitrile Gloves Medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              required
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
            <select
              required
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={inputClass}
            >
              <option value="">Select unit</option>
              {inventoryUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity In Stock</label>
            <input
              type="number"
              min="0"
              value={form.quantityInStock}
              onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
            <input
              type="number"
              min="0"
              value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        {isAdmin && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Vendor</label>
              <select
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                className={inputClass}
              >
                <option value="">No preferred vendor</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {!isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-700">
            Price and vendor details will be added by the clinic admin or super admin when ordering.
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Item'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/inventory')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
