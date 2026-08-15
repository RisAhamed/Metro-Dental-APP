'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Building2, UserCircle2 } from 'lucide-react';
import { inventoryUnits } from '@/lib/constants/inventoryUnits';
import { clinicName } from '@/lib/constants/clinics';

interface Vendor {
  vendorId: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  unit: string;
}

interface Consumption {
  consumptionId: string;
  quantity: number;
  remainingAfter: number;
  takenByName: string;
  notes: string | null;
  createdAt: string;
}

interface Item {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: string;
  vendorId: string | null;
  isActive: boolean;
  clinicId: string;
  createdByName: string | null;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export default function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { sessionClaims, userId } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const role = (sessionClaims?.role as string) || '';
  const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);

  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: '',
    quantityInStock: '0',
    reorderLevel: '10',
    unitPrice: '',
    vendorId: '',
  });

  const [consume, setConsume] = useState({
    quantity: '',
    takenBy: userId || '',
    notes: '',
  });

  const currentStock = item?.quantityInStock || 0;
  const consumeQty = Number(consume.quantity) || 0;
  const remaining = currentStock - consumeQty;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { itemId } = await params;
        const itemRes = await fetch(`/api/inventory/${itemId}`);
        const itemData = await itemRes.json();
        if (!cancelled && itemData.item) {
          setItem(itemData.item);
          setConsumptions(itemData.consumptions || []);
          setForm({
            name: itemData.item.name,
            category: itemData.item.category,
            unit: itemData.item.unit,
            quantityInStock: String(itemData.item.quantityInStock ?? 0),
            reorderLevel: String(itemData.item.reorderLevel ?? 10),
            unitPrice: String(itemData.item.unitPrice ?? ''),
            vendorId: itemData.item.vendorId || '',
          });
          const itemClinic = itemData.item.clinicId || 'clinic_a';
          const [catRes, staffRes] = await Promise.all([
            fetch('/api/inventory/categories'),
            fetch(`/api/users?clinicId=${itemClinic}`),
          ]);
          const catData = await catRes.json();
          const staffData = await staffRes.json();
          if (!cancelled) {
            setCategories(catData.categories || []);
            setStaff(staffData.users || []);
            setConsume((c) => ({ ...c, takenBy: userId || c.takenBy }));
            if (isAdmin) {
              const vendorRes = await fetch('/api/vendors?active=true');
              const vendorData = await vendorRes.json();
              if (!cancelled) setVendors(vendorData.vendors || []);
            }
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setError('Item not found');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error loading item:', err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params, userId, isAdmin]);

  const handleCategoryChange = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    setForm((f) => ({
      ...f,
      category: name,
      unit: cat?.unit || f.unit,
    }));
  };

  const handleConsume = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { itemId } = await params;
      const res = await fetch(`/api/inventory/${itemId}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: consumeQty,
          takenBy: consume.takenBy,
          notes: consume.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to record consumption');
        setSaving(false);
        return;
      }
      router.push('/inventory');
    } catch (err) {
      console.error('Consume error:', err);
      setError('Failed to record consumption');
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { itemId } = await params;
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          unit: form.unit,
          quantityInStock: Number(form.quantityInStock) || 0,
          reorderLevel: Number(form.reorderLevel) || 10,
          unitPrice: Number(form.unitPrice) || 0,
          vendorId: form.vendorId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update item');
        setSaving(false);
        return;
      }
      router.push('/inventory');
    } catch (err) {
      console.error('Update item error:', err);
      setError('Failed to update item');
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{item?.name}</h1>
      <div className="text-sm text-gray-500 mb-2">
        {item?.category} · Unit: {item?.unit}
      </div>
      <div className="flex flex-wrap gap-2 text-xs mb-6">
        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1">
          <Building2 className="h-3 w-3" /> {clinicName(item?.clinicId)}
        </span>
        {item?.createdByName && (
          <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1">
            <UserCircle2 className="h-3 w-3" /> Added by {item.createdByName}
          </span>
        )}
      </div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Stock / Take Out panel for everyone */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Stock / Take Out</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentStock <= (item?.reorderLevel || 0)
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {currentStock} {item?.unit} in stock
          </span>
        </div>
        <form onSubmit={handleConsume} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Taken Out</label>
              <input
                type="number"
                min="1"
                max={currentStock}
                required
                value={consume.quantity}
                onChange={(e) => setConsume({ ...consume, quantity: e.target.value })}
                className={inputClass}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Who took it out *
              </label>
              <select
                required
                value={consume.takenBy}
                onChange={(e) => setConsume({ ...consume, takenBy: e.target.value })}
                className={inputClass}
              >
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replaceAll('_', ' ')})
                  </option>
                ))}
                {!staff.some((u) => u.id === consume.takenBy) && (
                  <option value={consume.takenBy}>Me</option>
                )}
              </select>
            </div>
          </div>
          {consumeQty > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
              Remaining after take out:{' '}
              <span className="font-semibold">
                {remaining >= 0 ? remaining : '0'} {item?.unit}
              </span>
              {consumeQty > currentStock && (
                <span className="text-red-600 block mt-1">
                  Not enough stock! Only {currentStock} available.
                </span>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={consume.notes}
              onChange={(e) => setConsume({ ...consume, notes: e.target.value })}
              className={inputClass}
              placeholder="e.g. Used in Room 2"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || consumeQty <= 0 || consumeQty > currentStock}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Take Out & Save'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/inventory')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
          </div>
        </form>
      </div>

      {/* Consumption history */}
      {consumptions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Who Took What</h2>
          <div className="space-y-3">
            {consumptions.map((c) => (
              <div
                key={c.consumptionId}
                className="flex items-start justify-between border-b border-gray-100 pb-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.takenByName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleString()} {c.notes && `· ${c.notes}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">-{c.quantity} {item?.unit}</p>
                  <p className="text-xs text-gray-500">Remaining: {c.remainingAfter}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full edit only for admin */}
      {isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Edit Item Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              className={inputClass}
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
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
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
      )}
    </div>
  );
}
