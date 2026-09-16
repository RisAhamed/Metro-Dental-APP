'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Eye, Printer, Plus, Save, Loader2 } from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

interface RealInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: string;
  amountPaid: string;
  paymentStatus: string;
  planId: string | null;
}

interface PatientRealInvoicesProps {
  patientId: string;
}

export function PatientRealInvoices({ patientId }: PatientRealInvoicesProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RealInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAmounts, setEditingAmounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/invoices`);
        const data = await res.json();
        if (!cancelled && res.ok) setInvoices(data.invoices || []);
      } catch {
        // empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
      UNPAID: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const handleAmountChange = (invoiceId: string, value: number) => {
    setEditingAmounts((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const handleSavePayment = async (inv: RealInvoice) => {
    const newAmount = editingAmounts[inv.invoiceId];
    if (newAmount === undefined) return;
    setSaving(inv.invoiceId);
    try {
      const res = await fetch(`/api/invoices/${inv.invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaid: newAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((i) =>
            i.invoiceId === inv.invoiceId
              ? { ...i, amountPaid: data.invoice.amountPaid, paymentStatus: data.invoice.paymentStatus }
              : i
          )
        );
        setEditingAmounts((prev) => {
          const next = { ...prev };
          delete next[inv.invoiceId];
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-blue-500" /> Invoices
        </h3>
        <button
          onClick={() => router.push(`/patients/${patientId}/billing/invoices/new`)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} message="No invoices yet. Generate one from a treatment plan." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {invoices.map((inv) => {
                const grandTotal = parseFloat(inv.grandTotal) || 0;
                const currentPaid = editingAmounts[inv.invoiceId] !== undefined
                  ? editingAmounts[inv.invoiceId]
                  : parseFloat(inv.amountPaid) || 0;
                const balanceDue = Math.max(0, grandTotal - currentPaid);
                const computedStatus = currentPaid >= grandTotal ? 'PAID' : currentPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
                const hasChanges = editingAmounts[inv.invoiceId] !== undefined;

                return (
                  <tr
                    key={inv.invoiceId}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/invoices/${inv.invoiceId}`)}
                  >
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{formatDateDDMMM(inv.invoiceDate)}</td>
                    <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">{formatMoney(inv.grandTotal)}</td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={currentPaid}
                          onChange={(e) => handleAmountChange(inv.invoiceId, Math.max(0, parseFloat(e.target.value) || 0))}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {hasChanges && (
                          <button
                            onClick={() => handleSavePayment(inv)}
                            disabled={saving === inv.invoiceId}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                            title="Save"
                          >
                            {saving === inv.invoiceId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-sm text-right font-medium ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${statusBadge(hasChanges ? computedStatus : inv.paymentStatus)}`}>
                        {(hasChanges ? computedStatus : inv.paymentStatus).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/invoices/${inv.invoiceId}`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/invoices/${inv.invoiceId}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        Invoices generated from treatment plans appear here. Legacy session-based invoices are shown in the Ledger section.
      </p>
    </div>
  );
}
