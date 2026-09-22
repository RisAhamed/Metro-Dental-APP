'use client';

import { useState } from 'react';

export const PURCHASE_PAYMENT_MODES = [
  'CASH',
  'GPAY',
  'PHONEPE',
  'PAYTM',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
] as const;

interface PaymentModalProps {
  purchaseNumber: string;
  totalAmount: number;
  alreadyPaid: number;
  balanceDue: number;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (payload: { amount: number; mode: string; reference: string; paymentDate: string; notes: string }) => Promise<{ ok: boolean; error?: string }>;
}

export function PaymentModal({ purchaseNumber, totalAmount, alreadyPaid, balanceDue, onClose, onSuccess, onSubmit }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > balanceDue) { setError(`Payment of ₹${amt.toFixed(2)} exceeds balance due of ₹${balanceDue.toFixed(2)} for ${purchaseNumber}.`); return; }
    setSaving(true);
    setError('');
    try {
      const res = await onSubmit({ amount: amt, mode, reference, paymentDate, notes });
      if (res.ok) { onSuccess(); onClose(); }
      else setError(res.error || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Record Payment — {purchaseNumber}</h3>
        <div className="text-sm space-y-1 mb-4 bg-gray-50 rounded-md p-3">
          <div className="flex justify-between"><span>Total Amount:</span><span className="font-medium">₹{totalAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Already Paid:</span><span>₹{alreadyPaid.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Balance Due:</span><span className="font-bold">₹{balanceDue.toFixed(2)}</span></div>
        </div>
        <label className="block text-sm font-medium mb-1">Payment Amount *</label>
        <input type="number" min={0} step="0.01" max={balanceDue} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-md px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1">Payment Type *</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full border rounded-md px-3 py-2 mb-3">
          <option value="CASH">Cash</option>
          <option value="GPAY">Google Pay</option>
          <option value="PHONEPE">PhonePe</option>
          <option value="PAYTM">Paytm</option>
          <option value="DEBIT_CARD">Debit Card</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>
        <label className="block text-sm font-medium mb-1">Reference No.</label>
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="cheque/transaction ID" className="w-full border rounded-md px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1">Payment Date *</label>
        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full border rounded-md px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-md px-3 py-2 mb-3" />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Record Payment'}</button>
        </div>
      </div>
    </div>
  );
}
