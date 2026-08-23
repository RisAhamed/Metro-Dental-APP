'use client';

import { Receipt, Wallet, Scale } from 'lucide-react';
import { StatusBadge, EmptyState, formatMoney, formatDateDDMMM } from './shared';

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
  patient: {
    advanceBalance?: string | null;
    totalPaid?: string | null;
    totalDue?: string | null;
    lastVisitDate?: string | null;
  };
  summary: LedgerSummary;
  loading: boolean;
}

export function PatientLedger({ patient, summary, loading }: PatientLedgerProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Scale className="h-5 w-5 text-blue-500" /> Ledger
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading ledger...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                Total Invoiced
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {formatMoney(summary.totalInvoiced)}
              </p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                Total Paid
              </p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {formatMoney(patient.totalPaid ?? summary.totalPaid)}
              </p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                Balance Due
              </p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {formatMoney(patient.totalDue ?? summary.balanceDue)}
              </p>
            </div>
          </div>

          {Number(patient.advanceBalance || 0) > 0 && (
            <p className="text-sm text-gray-600 mb-4">
              Advance Balance:{' '}
              <span className="font-semibold text-green-600">
                {formatMoney(patient.advanceBalance)}
              </span>
            </p>
          )}

          <p className="text-xs text-gray-400">
            See the Invoices section for per-session billing detail.
          </p>
        </>
      )}
    </div>
  );
}
