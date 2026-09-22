'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PaymentModal } from '@/components/inventory/PaymentModal';
import { clinicName } from '@/lib/constants/clinics';

interface PurchaseDetail {
  purchaseId: string;
  purchaseNumber: string;
  vendorName: string;
  clinicId?: string;
  purchaseDate: string;
  invoiceNumber?: string | null;
  lineItems: Array<{ itemName: string; quantity: number; unitPrice: number; totalPrice: number; unit: string }>;
  totalAmount?: string;
  amountPaid?: string;
  balanceDue?: string;
  paymentStatus?: string;
  notes?: string | null;
}
interface PayRow { paymentId: string; amount: string; paymentDate: string; mode: string | null; reference: string | null; notes: string | null; recordedByName: string; }

export default function PurchaseDetailPage() {
  const params = useParams();
  const purchaseId = params.purchaseId as string;
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const canSeeFinancials = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const canRecordPayment = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [showModal, setShowModal] = useState(false);
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

  const handlePaymentSubmit = async (payload: { amount: number; mode: string; reference: string; paymentDate: string; notes: string }) => {
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { await load(); return { ok: true }; }
      return { ok: false, error: data.error || 'Failed' };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!purchase) return <div className="text-center py-12 text-gray-500">Not found</div>;

  const total = Number(purchase.totalAmount || 0);
  const paid = Number(purchase.amountPaid || 0);
  const balance = Number(purchase.balanceDue ?? total - paid);

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/inventory/purchases" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold mb-2">{purchase.purchaseNumber} — {purchase.vendorName}</h1>
      <p className="text-sm text-gray-500 mb-6">{purchase.clinicId ? `${clinicName(purchase.clinicId)} · ` : ''}{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}{purchase.invoiceNumber ? ` · Invoice: ${purchase.invoiceNumber}` : ''}</p>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Line Items</h2>
        {purchase.lineItems.map((li, i) => (
          <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
            <span>{li.itemName} × {li.quantity} {li.unit}</span>
            <span>₹{Number(li.totalPrice).toFixed(2)}</span>
          </div>
        ))}
        {canSeeFinancials && (
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="font-bold">₹{total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>₹{paid.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Balance</span><span>₹{balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Status</span><span>{purchase.paymentStatus}</span></div>
          </div>
        )}
      </div>
      {canRecordPayment && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Payment Summary</h2>
            <button onClick={() => setShowModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md">Record Payment</button>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Full Amount</span><span>₹{total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Amount Paid</span><span>₹{paid.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Balance Due</span><span className="font-medium">₹{balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Status</span><span>{purchase.paymentStatus}</span></div>
          </div>
        </div>
      )}
      {canSeeFinancials && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Payment History</h2>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Date</th>
                <th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Amount</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Mode</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Reference</th>
                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.paymentId} className="border-t">
                  <td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2 text-right">₹{Number(p.amount).toFixed(2)}</td>
                  <td className="px-3 py-2">{(p.mode || '').replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{p.reference || '—'}</td>
                  <td className="px-3 py-2">{p.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="text-sm text-gray-400 mt-2">No payments yet.</p>}
          <p className="text-sm mt-3">Total Paid: ₹{paid.toFixed(2)} / ₹{total.toFixed(2)} — Status: {purchase.paymentStatus}</p>
        </div>
      )}
      {showModal && (
        <PaymentModal
          purchaseNumber={purchase.purchaseNumber}
          totalAmount={total}
          alreadyPaid={paid}
          balanceDue={balance}
          onClose={() => setShowModal(false)}
          onSuccess={load}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}
