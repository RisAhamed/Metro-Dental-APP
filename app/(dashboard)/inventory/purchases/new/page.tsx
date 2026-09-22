'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Vendor { vendorId: string; name: string; }
interface InvItem { itemId: string; name: string; category: string; unit: string; unitPrice: string; }

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectItem = searchParams.get('itemId');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ itemId: string; itemName: string; category: string; unit: string; quantity: number; unitPrice: number }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/vendors?active=true').then((r) => r.json()).then((d) => setVendors(d.vendors || [])).catch(() => {});
    fetch('/api/inventory').then((r) => r.json()).then((d) => {
      setItems(d.items || []);
      if (preselectItem) {
        const found = (d.items || []).find((i: InvItem) => i.itemId === preselectItem);
        if (found) setLines([{ itemId: found.itemId, itemName: found.name, category: found.category, unit: found.unit, quantity: 1, unitPrice: Number(found.unitPrice || 0) }]);
      }
    }).catch(() => {});
  }, [preselectItem]);

  const addLine = (itemId: string) => {
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return;
    setLines((prev) => [...prev, { itemId: found.itemId, itemName: found.name, category: found.category, unit: found.unit, quantity: 1, unitPrice: Number(found.unitPrice || 0) }]);
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const handleSave = async () => {
    const vendor = vendors.find((v) => v.vendorId === vendorId);
    if (!vendor || lines.length === 0) { alert('Select vendor and add items'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, vendorName: vendor.name, invoiceNumber, notes, lineItems: lines }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/inventory/purchases/${data.purchaseId}`);
      else alert(data.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/inventory/purchases" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold mb-6">Record Purchase</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vendor</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded-md px-3 py-2">
            <option value="">Select vendor</option>
            {vendors.map((v) => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vendor Invoice # (optional)</label>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Add Item</label>
          <select value="" onChange={(e) => { if (e.target.value) addLine(e.target.value); }} className="w-full border rounded-md px-3 py-2">
            <option value="">Select item to add</option>
            {items.map((i) => <option key={i.itemId} value={i.itemId}>{i.name} ({i.unit})</option>)}
          </select>
        </div>
        {lines.map((l, idx) => (
          <div key={idx} className="flex gap-2 items-center border rounded-md p-2">
            <span className="flex-1 text-sm">{l.itemName}</span>
            <input type="number" min={1} value={l.quantity} onChange={(e) => setLines((p) => p.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} className="w-20 border rounded px-2 py-1" />
            <input type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => setLines((p) => p.map((x, i) => i === idx ? { ...x, unitPrice: Number(e.target.value) } : x))} className="w-24 border rounded px-2 py-1" />
            <span className="text-sm w-20 text-right">₹{(l.quantity * l.unitPrice).toFixed(2)}</span>
            <button onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="text-red-600 text-sm">Remove</button>
          </div>
        ))}
        <div className="text-right font-bold">Total: ₹{total.toFixed(2)}</div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-md px-3 py-2" />
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save Purchase'}</button>
      </div>
    </div>
  );
}
