'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

interface Vendor {
  vendorId: string;
  name: string;
}

interface InventoryItem {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: string;
}

interface LineItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantityOrdered: number;
  unitPrice: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preItemId = searchParams.get('itemId');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [vendorRes, itemRes] = await Promise.all([
          fetch('/api/vendors?active=true'),
          fetch('/api/inventory'),
        ]);
        const vendorData = await vendorRes.json();
        const itemData = await itemRes.json();
        if (!cancelled) {
          const inv = itemData.items || [];
          setVendors(vendorData.vendors || []);
          setInventory(inv);
          if (preItemId) {
            const item = inv.find((i: InventoryItem) => i.itemId === preItemId);
            if (item) {
              setLineItems([
                {
                  itemId: item.itemId,
                  itemName: item.name,
                  category: item.category,
                  unit: item.unit,
                  quantityOrdered: item.reorderLevel ?? 10,
                  unitPrice: Number(item.unitPrice) || 0,
                },
              ]);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading order form:', err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preItemId]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        itemId: '',
        itemName: '',
        category: '',
        unit: '',
        quantityOrdered: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = next[index];
      if (field === 'itemId') {
        const inv = inventory.find((i) => i.itemId === value);
        next[index] = {
          ...item,
          itemId: value as string,
          itemName: inv?.name || '',
          category: inv?.category || '',
          unit: inv?.unit || '',
          unitPrice: Number(inv?.unitPrice) || 0,
        };
      } else {
        next[index] = { ...item, [field]: Number(value) };
      }
      return next;
    });
  };

  const total = lineItems.reduce((sum, li) => sum + li.quantityOrdered * li.unitPrice, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }
    if (lineItems.length === 0) {
      setError('Add at least one line item');
      return;
    }
    const vendor = vendors.find((v) => v.vendorId === vendorId);
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorName: vendor?.name || '',
          lineItems,
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create order');
        setSaving(false);
        return;
      }
      router.push(`/inventory/purchase-orders/${data.orderId}`);
    } catch (err) {
      console.error('Create order error:', err);
      setError('Failed to create order');
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Purchase Order</h1>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="pb-2 pr-2">Item</th>
                <th className="pb-2 pr-2 w-24">Qty</th>
                <th className="pb-2 pr-2 w-32">Unit Price (₹)</th>
                <th className="pb-2 pr-2 w-32 text-right">Total</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, index) => (
                <tr key={index} className="border-t border-gray-100">
                  <td className="py-2 pr-2">
                    <select
                      value={li.itemId}
                      onChange={(e) => updateLineItem(index, 'itemId', e.target.value)}
                      className={`${inputClass} text-sm`}
                    >
                      <option value="">Select item</option>
                      {inventory.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {item.name} ({item.unit}) - {item.quantityInStock} in stock
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="1"
                      value={li.quantityOrdered}
                      onChange={(e) => updateLineItem(index, 'quantityOrdered', e.target.value)}
                      className={`${inputClass} text-sm`}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={li.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                      className={`${inputClass} text-sm`}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right text-sm font-medium">
                    ₹{(li.quantityOrdered * li.unitPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400 text-sm">
                    No items added. Click &quot;Add Item&quot; to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} min-h-[80px]`}
            placeholder="Optional notes for the vendor..."
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Order Total</p>
            <p className="text-2xl font-bold">₹{total.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/inventory/purchase-orders')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
