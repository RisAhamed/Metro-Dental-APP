'use client';

import { useState, useEffect, useRef } from 'react';
import { Receipt, Wallet, Scale, Filter, Printer, Download } from 'lucide-react';
import { StatusBadge, EmptyState, formatMoney, formatDateDDMMM } from './shared';
import { ClinicPrintHeader } from '@/components/print/ClinicPrintHeader';

export interface DerivedInvoice {
  visitId: string;
  date: string;
  label: string;
  total: number;
  paid: number;
  due: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
}

export interface PatientPayment {
  paymentId: string;
  amount: string | number;
  mode: string;
  date: string;
  recordedByName: string;
  notes: string | null;
}

interface LedgerSummary {
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  invoiceNumber: string;
  details: string;
  type: 'Invoice' | 'Payment';
  credit: number;
  debit: number;
  balance: number;
}

function InvoiceTable({ invoices }: { invoices: DerivedInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Due</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {invoices.map((inv) => (
            <tr key={inv.visitId}>
              <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                {formatDateDDMMM(inv.date)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-700">{inv.label}</td>
              <td className="px-4 py-2 text-sm text-right text-gray-700">
                {formatMoney(inv.total)}
              </td>
              <td className="px-4 py-2 text-sm text-right text-green-600">
                {formatMoney(inv.paid)}
              </td>
              <td className={`px-4 py-2 text-sm text-right font-medium ${inv.due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {formatMoney(inv.due)}
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PatientInvoices({ invoices, loading }: { invoices: DerivedInvoice[]; loading: boolean }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-blue-500" /> Invoices
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} message="No invoices yet." />
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}

interface PatientPaymentsSectionProps {
  payments: PatientPayment[];
  loading: boolean;
}

export function PatientPaymentsSection({ payments, loading }: PatientPaymentsSectionProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-green-500" /> Payments
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading payments...</p>
      ) : payments.length === 0 ? (
        <EmptyState icon={Wallet} message="No payments recorded yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.paymentId}>
                  <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                    {formatDateDDMMM(p.date)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{p.paymentId}</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                    {formatMoney(p.amount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {p.mode.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{p.recordedByName}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface PatientLedgerProps {
  patientId: string;
  patient: {
    name?: string;
    patientId?: string;
    advanceBalance?: string | null;
    totalPaid?: string | null;
    totalDue?: string | null;
    lastVisitDate?: string | null;
  };
  summary: LedgerSummary;
  loading: boolean;
}

export function PatientLedger({ patientId, patient, summary, loading }: PatientLedgerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'invoice' | 'payment'>('all');
  const [loadingEntries, setLoadingEntries] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadEntries = async () => {
      try {
        const [invRes, payRes] = await Promise.all([
          fetch(`/api/patients/${patientId}/invoices`),
          fetch(`/api/payments?patientId=${patientId}`),
        ]);
        const [invData, payData] = await Promise.all([invRes.json(), payRes.json()]);
        
        if (cancelled) return;
        
        const ledgerEntries: LedgerEntry[] = [];
        let runningBalance = 0;
        
        // Process invoices
        (invData.invoices || []).forEach((inv: { invoiceId: string; invoiceNumber: string; invoiceDate: string; grandTotal: string | number; amountPaid: string | number }) => {
          const grandTotal = parseFloat(String(inv.grandTotal)) || 0;
          runningBalance += grandTotal;
          ledgerEntries.push({
            id: inv.invoiceId,
            date: inv.invoiceDate,
            invoiceNumber: inv.invoiceNumber,
            details: inv.invoiceNumber,
            type: 'Invoice',
            credit: grandTotal,
            debit: 0,
            balance: runningBalance,
          });
        });
        
        // Process payments
        (payData.payments || []).forEach((pay: { paymentId: string; amount: string | number; date: string; mode: string }) => {
          const amount = parseFloat(String(pay.amount)) || 0;
          runningBalance -= amount;
          ledgerEntries.push({
            id: pay.paymentId,
            date: pay.date,
            invoiceNumber: pay.paymentId,
            details: `Payment (${pay.mode.replace(/_/g, ' ')})`,
            type: 'Payment',
            credit: 0,
            debit: amount,
            balance: runningBalance,
          });
        });
        
        // Sort by date ascending
        ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setEntries(ledgerEntries);
      } catch {
        // silent
      } finally {
        setLoadingEntries(false);
      }
    };
    loadEntries();
    return () => { cancelled = true; };
  }, [patientId]);

  const filteredEntries = entries.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'invoice') return e.type === 'Invoice';
    if (filter === 'payment') return e.type === 'Payment';
    return true;
  });

  const totalCredits = filteredEntries.reduce((sum, e) => sum + e.credit, 0);
  const totalDebits = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const finalBalance = totalCredits - totalDebits;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden no-print">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-500" /> Ledger
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total Invoiced</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{formatMoney(summary.totalInvoiced)}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total Paid</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(patient.totalPaid ?? summary.totalPaid)}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Balance Due</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatMoney(patient.totalDue ?? summary.balanceDue)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 print:hidden no-print">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Filter:</span>
        {(['all', 'invoice', 'payment'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-md capitalize ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading || loadingEntries ? (
        <p className="text-sm text-gray-500">Loading ledger...</p>
      ) : filteredEntries.length === 0 ? (
        <EmptyState icon={Scale} message="No transactions found." />
      ) : (
        <>
          <div ref={printRef} className="overflow-x-auto print-area">
            <ClinicPrintHeader />
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice/Receipt #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{formatDateDDMMM(entry.date)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.invoiceNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.details}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        entry.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {entry.credit > 0 ? formatMoney(entry.credit) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {entry.debit > 0 ? formatMoney(entry.debit) : '—'}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatMoney(Math.abs(entry.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">TOTALS</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{formatMoney(totalCredits)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{formatMoney(totalDebits)}</td>
                  <td className={`px-4 py-3 text-sm text-right font-bold ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMoney(Math.abs(finalBalance))} due
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {Number(patient.advanceBalance || 0) > 0 && (
        <p className="text-sm text-gray-600 mt-4">
          Advance Balance: <span className="font-semibold text-green-600">{formatMoney(patient.advanceBalance)}</span>
        </p>
      )}
    </div>
  );
}
