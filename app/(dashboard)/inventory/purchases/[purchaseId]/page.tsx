'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PurchaseDetail {
  purchaseId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  invoiceNumber?: string | null;
  lineItems: Array<{ itemName: string; quantity: number; unitPrice: number; totalPrice: number; unit: string }>;
  totalAmount?: string;
  amountPaid?: string;
  balanceDue?: string;
  paymentStatus?: string;
  notes?: string | null;
}
interface PayRow { paymentId: string; amount: string; paymentDate: string; mode: string | null; reference: string | null; recordedByName: string; }

export default function PurchaseDetailPage() {
  const params = useParams();
  const purchaseId = params.purchaseId as string;
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const canSeeFinancials = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/purchases/${purchaseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPurchase(data.purchase ?? null);
        setPayments(data.payments || []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [purchaseId]);

  const load = async () => {
    const res = await fetch(`/api/purchases/${purchaseId}`);
    const data = await res.json();
    if (res.ok) { setPurchase(data.purchase); setPayments(data.payments || []); }
  };

  const handlePay = async () => {
    if (!amount) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), mode }),
      });
      if (res.ok) { setAmount(''); load(); }
      else alert('Failed to record payment');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!purchase) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/inventory/purchases" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold mb-2">{purchase.purchaseNumber} — {purchase.vendorName}</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}</p>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Items</h2>
        {purchase.lineItems.map((li, i) => (
          <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
            <span>{li.itemName} × {li.quantity} {li.unit}</span>
            <span>₹{Number(li.totalPrice).toFixed(2)}</span>
          </div>
        ))}
        {canSeeFinancials && (
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="font-bold">₹{Number(purchase.totalAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>₹{Number(purchase.amountPaid || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Balance</span><span>₹{Number(purchase.balanceDue || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Status</span><span>{purchase.paymentStatus}</span></div>
          </div>
        )}
      </div>
      {canSeeFinancials && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Payments</h2>
          {payments.map((p) => (
            <div key={p.paymentId} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>{new Date(p.paymentDate).toLocaleDateString('en-IN')} — {p.mode} {p.reference ? `(${p.reference})` : ''} by {p.recordedByName}</span>
              <span>₹{Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="border rounded px-3 py-2 w-40" />
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="border rounded px-3 py-2">
              <option>CASH</option><option>UPI</option><option>BANK_TRANSFER</option><option>CHEQUE</option><option>OTHER</option>
            </select>
            <button onClick={handlePay} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50">Record Payment</button>
          </div>
        </div>
      )}
    </div>
  );
}
