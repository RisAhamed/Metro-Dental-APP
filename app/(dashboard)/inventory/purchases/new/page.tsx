'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { PURCHASE_PAYMENT_MODES } from '@/components/inventory/PaymentModal';

interface Vendor { vendorId: string; name: string; }
interface CatalogItem { itemId: string; name: string; category: string; unit: string; unitPrice: string; }
interface LineItem { id: string; itemId: string; itemName: string; category: string; unit: string; quantity: number; unitPrice: number; lineTotal: number; }

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectItem = searchParams.get('itemId');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [clinicId, setClinicId] = useState('clinic_a');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [fullAmount, setFullAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [catalogUnit, setCatalogUnit] = useState('');
  const [addingCatalog, setAddingCatalog] = useState(false);

  const isAdmin = true;
  const canSeeFinancials = true;

  useEffect(() => {
    fetch('/api/vendors?active=true').then((r) => r.json()).then((d) => setVendors(d.vendors || [])).catch(() => {});
    fetch('/api/inventory').then((r) => r.json()).then((d) => {
      const allItems = d.items || [];
      setItems(allItems);
      if (preselectItem) {
        const found = allItems.find((i: CatalogItem) => i.itemId === preselectItem);
        if (found) {
          setLines([{ id: '1', itemId: found.itemId, itemName: found.name, category: found.category || '', unit: found.unit, quantity: 1, unitPrice: Number(found.unitPrice || 0), lineTotal: Number(found.unitPrice || 0) }]);
          setAmountPaid(String(Number(found.unitPrice || 0)));
        }
      }
    }).catch(() => {});
    fetch('/api/users/me').then((r) => r.json()).then((d) => {
      if (d?.user?.primaryClinicId) setClinicId(d.user.primaryClinicId);
    }).catch(() => {});
  }, [preselectItem]);

  const addLine = useCallback((itemId: string) => {
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return;
    setLines((prev) => [...prev, { id: Date.now().toString(), itemId: found.itemId, itemName: found.name, category: found.category || '', unit: found.unit, quantity: 1, unitPrice: Number(found.unitPrice || 0), lineTotal: Number(found.unitPrice || 0) }]);
  }, [items]);

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const numVal = typeof value === 'string' ? Number(value) : value;
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? numVal : l.quantity;
        const price = field === 'unitPrice' ? numVal : l.unitPrice;
        return { ...l, [field]: numVal, lineTotal: qty * price };
      }
      return { ...l, [field]: value };
    }));
  };

  const computedTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const displayFullAmount = fullAmount !== '' ? Number(fullAmount) : computedTotal;
  const balanceDue = displayFullAmount - Number(amountPaid || 0);
  const paymentStatus = Number(amountPaid || 0) <= 0 ? 'UNPAID' : Number(amountPaid || 0) >= displayFullAmount ? 'PAID' : 'PARTIALLY_PAID';

  const handleAddCatalog = async () => {
    if (!catalogName.trim()) return;
    setAddingCatalog(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catalogName.trim(), category: 'General', unit: catalogUnit || 'Piece', clinicId }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => [...prev, { itemId: data.itemId, name: catalogName.trim(), category: 'General', unit: catalogUnit || 'Piece', unitPrice: '0' }]);
        setShowAddCatalog(false);
        setCatalogName('');
        setCatalogUnit('');
        addLine(data.itemId);
      } else {
        alert(data.error || 'Failed to add catalog item');
      }
    } finally {
      setAddingCatalog(false);
    }
  };

  const handleSave = async () => {
    if (!vendorId) { alert('Select a vendor'); return; }
    if (lines.length === 0) { alert('Add at least one item'); return; }
    if (Number(amountPaid || 0) > displayFullAmount) { alert('Amount paid cannot exceed full amount'); return; }
    if (Number(amountPaid || 0) > 0 && !paymentMode) { alert('Select a payment method'); return; }
    setSaving(true);
    setError('');
    try {
      const vendor = vendors.find((v) => v.vendorId === vendorId);
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorName: vendor?.name || '',
          clinicId,
          purchaseDate,
          invoiceNumber,
          lineItems: lines.map((l) => ({ itemId: l.itemId, itemName: l.itemName, category: l.category, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice })),
          notes,
          amountPaid: Number(amountPaid || 0).toFixed(2),
          paymentMode: paymentMode || null,
          paymentReference: paymentReference || null,
          fullAmount: displayFullAmount.toFixed(2),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/inventory/purchases/${data.purchaseId}`);
      } else {
        alert(data.error || 'Failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/inventory/purchases" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold mb-6">Record Purchase</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor *</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option value="">Select vendor</option>
              {vendors.map((v) => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Clinic *</label>
            <select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option value="clinic_a">Clinic A</option>
              <option value="clinic_b">Clinic B</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Purchase Date *</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Invoice # (optional)</label>
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="INV-2026-..." />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Line Items</label>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="flex gap-2 items-center border rounded-md p-2 bg-gray-50 flex-wrap">
                <span className="flex-1 text-sm font-medium min-w-[140px]">{l.itemName}</span>
                <span className="text-xs text-gray-500 min-w-[80px]">{l.category}</span>
                <span className="text-xs text-gray-500 min-w-[40px]">{l.unit}</span>
                <input type="number" min={1} value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', e.target.value)} className="w-16 border rounded px-2 py-1 text-sm" placeholder="qty" />
                <input type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => updateLine(l.id, 'unitPrice', e.target.value)} className="w-20 border rounded px-2 py-1 text-sm" placeholder="price" />
                <span className="text-sm w-20 text-right font-medium">₹{l.lineTotal.toFixed(2)}</span>
                <button onClick={() => removeLine(l.id)} className="text-red-600 hover:text-red-800 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <select onChange={(e) => { if (e.target.value) { addLine(e.target.value); e.target.value = ''; } }} className="flex-1 border rounded-md px-3 py-2 text-sm">
              <option value="">+ Add item row</option>
              {items.filter((i) => !lines.find((l) => l.itemId === i.itemId)).map((i) => (
                <option key={i.itemId} value={i.itemId}>{i.name} ({i.unit})</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowAddCatalog(true)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">+ Add to Catalog</button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-4 space-y-2 border">
          <div className="flex justify-between text-sm"><span>Computed Total</span><span>₹{computedTotal.toFixed(2)}</span></div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Amount (editable) *</label>
            <input type="number" min={0} step="0.01" value={fullAmount} onChange={(e) => setFullAmount(e.target.value)} className="w-full border rounded-md px-3 py-2 font-medium" placeholder={computedTotal.toFixed(2)} />
          </div>
        </div>

        {canSeeFinancials && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
            <h3 className="font-semibold text-blue-900">Payment Now</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount Paid Now *</label>
                <input type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder={displayFullAmount.toFixed(2)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border rounded-md px-3 py-2">
                  <option value="">Select method</option>
                  {PURCHASE_PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reference (optional)</label>
                <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="cheque/Txn ID" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Balance Due</label>
                <input type="text" value={`₹${Math.max(0, balanceDue).toFixed(2)}`} disabled className="w-full border rounded-md px-3 py-2 bg-gray-100 font-medium" />
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span>Status: <strong>{paymentStatus}</strong></span>
              <span>Full: ₹{displayFullAmount.toFixed(2)}</span>
              <span>Paid: ₹{(Number(amountPaid || 0)).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-md px-3 py-2" rows={3} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push('/inventory/purchases')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Purchase'}</button>
        </div>
      </div>

      {showAddCatalog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add to Catalog</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <input value={catalogName} onChange={(e) => setCatalogName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. Surgical Gloves" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select value={catalogUnit} onChange={(e) => setCatalogUnit(e.target.value)} className="w-full border rounded-md px-3 py-2">
                  <option value="Piece">Piece</option>
                  <option value="Box">Box</option>
                  <option value="kg">kg</option>
                  <option value="Pack">Pack</option>
                  <option value="Roll">Roll</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddCatalog(false)} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
              <button onClick={handleAddCatalog} disabled={addingCatalog || !catalogName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">{addingCatalog ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
