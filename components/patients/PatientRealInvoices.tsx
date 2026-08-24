'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Eye, Printer } from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

interface RealInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: string;
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

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-blue-500" /> Invoices
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} message="No invoices yet. Generate one from a treatment plan." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.invoiceId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDateDDMMM(inv.invoiceDate)}</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">{formatMoney(inv.grandTotal)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${statusBadge(inv.paymentStatus)}`}>
                      {inv.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
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
              ))}
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
