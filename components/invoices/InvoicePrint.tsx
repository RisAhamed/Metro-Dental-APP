'use client';

import { forwardRef } from 'react';

interface InvoiceProcedure {
  procedureId: string;
  procedureName: string;
  qty: number;
  unitCost: number;
  discount: number;
  total: number;
  toothNumbers?: number[] | null;
  notes?: string | null;
}

interface InvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  planId: string | null;
  procedures: InvoiceProcedure[];
  subtotal: string;
  totalDiscount: string;
  grandTotal: string;
  amountPaid: string;
  paymentStatus: string;
  createdBy: string;
}

interface PatientInfo {
  patientId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  primaryPhone?: string | null;
}

interface ClinicInfo {
  clinicId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface InvoicePrintProps {
  invoice: InvoiceData;
  patient?: PatientInfo | null;
  clinic?: ClinicInfo | null;
  pdfMode?: boolean;
}

const INVOICE_STYLES = `
  @media print {
    @page { size: A4; margin: 12mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
    body * { visibility: hidden; }
    #invoice-print-area, #invoice-print-area * { visibility: visible; }
    #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; margin: 0 !important; }
    .no-print { display: none !important; }
  }
  .invoice-pdf-table { table-layout: fixed; width: 100%; }
  .invoice-pdf-table th,
  .invoice-pdf-table td { overflow-wrap: anywhere; word-break: break-word; }
  .invoice-pdf-totals { max-width: 280px; }
`;

function formatCurrency(value: string | number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyShort(value: string | number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ invoice, patient, clinic, pdfMode }, ref) => {
    const clinicName = clinic?.name || 'Metro Dental Clinic';
    const clinicAddress = clinic?.address || 'Clinic Address, Phone, Email';
    const clinicPhone = clinic?.phone;
    const clinicEmail = clinic?.email;

    const contactLine = [clinicAddress, clinicPhone, clinicEmail].filter(Boolean).join(' • ');

    return (
      <div
        ref={ref}
        id="invoice-print-area"
        className="bg-white text-gray-900"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: pdfMode ? '32px' : undefined,
          width: pdfMode ? '794px' : undefined,
          boxSizing: 'border-box',
          maxWidth: pdfMode ? '794px' : '800px',
          margin: pdfMode ? '0' : '0 auto',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        <style>{INVOICE_STYLES}</style>

        {/* Clinic Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4" style={{ minWidth: 0 }}>
          <h1
            className="text-2xl font-bold tracking-wide uppercase"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {clinicName}
          </h1>
          <p
            className="text-sm text-gray-600 mt-1"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {contactLine}
          </p>
        </div>

        {/* Invoice Meta */}
        <div
          className="mt-4 text-sm"
          style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', minWidth: 0 }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ overflowWrap: 'anywhere' }}>
              <span className="font-semibold">INVOICE #:</span> {invoice.invoiceNumber}
            </p>
          </div>
          <div style={{ minWidth: 0, flexShrink: 0, textAlign: 'right' }}>
            <p>
              <span className="font-semibold">Date:</span>{' '}
              {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50/50 print:bg-white">
          <div className="grid grid-cols-2 gap-2 text-sm" style={{ minWidth: 0 }}>
            <p style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span className="font-semibold">Patient Name:</span> {patient?.name || invoice.patientName}
            </p>
            <p style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span className="font-semibold">Patient ID:</span> {patient?.patientId || invoice.patientId}
            </p>
            <p>
              <span className="font-semibold">Age:</span> {patient?.age ?? '—'}
              <span className="ml-3 font-semibold">Gender:</span> {patient?.gender ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {patient?.primaryPhone || '—'}
            </p>
          </div>
        </div>

        {/* Procedures Table */}
        <div className="mt-6" style={{ overflowX: 'auto', minWidth: 0 }}>
          <table className="invoice-pdf-table text-sm border-collapse">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '54%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-3 text-left text-xs font-semibold">#</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">PROCEDURE</th>
                <th className="py-2 px-3 text-center text-xs font-semibold">QTY</th>
                <th className="py-2 px-3 text-right text-xs font-semibold">COST</th>
                <th className="py-2 px-3 text-right text-xs font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.procedures.map((proc, idx) => (
                <tr
                  key={`${proc.procedureId}-${idx}`}
                  className="border-b border-gray-200"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <td className="py-2.5 px-3 text-sm">{idx + 1}</td>
                  <td className="py-2.5 px-3" style={{ minWidth: 0 }}>
                    <p
                      className="text-sm font-medium"
                      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      {proc.procedureName}
                    </p>
                    {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                      <p
                        className="text-xs text-gray-500"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        Teeth: {proc.toothNumbers.map((t) => `[${t}]`).join(' ')}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm">{proc.qty}</td>
                  <td className="py-2.5 px-3 text-right text-sm" style={{ whiteSpace: 'nowrap' }}>
                    {formatCurrencyShort(proc.unitCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>
                    {formatCurrencyShort(proc.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className="invoice-pdf-totals space-y-1 text-sm" style={{ width: '100%', maxWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="text-gray-600">SUBTOTAL:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="text-gray-600">DISCOUNT:</span>
              <span className="font-medium">{formatCurrency(invoice.totalDiscount)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: '2px solid #1f2937',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.75rem' }}>
              <span className="text-gray-600">Amount Paid:</span>
              <span>{formatCurrency(invoice.amountPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.75rem', fontWeight: 600 }}>
              <span className="text-gray-800">Balance Due:</span>
              <span className="text-red-600">
                {formatCurrency(Number(invoice.grandTotal) - Number(invoice.amountPaid))}
              </span>
            </div>
          </div>
        </div>

        {/* Signature & Stamp */}
        <div
          className="mt-12"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 0 }}
        >
          <div className="text-center" style={{ minWidth: 0, flexShrink: 0 }}>
            <div style={{ width: '160px', height: '48px', borderBottom: '1px solid #9ca3af', marginBottom: '4px' }}></div>
            <p className="text-xs text-gray-600">Authorized Signature</p>
          </div>
          <div className="text-center" style={{ minWidth: 0, flexShrink: 0 }}>
            <div
              style={{
                width: '128px',
                height: '64px',
                border: '1px dashed #d1d5db',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-xs text-gray-400">Clinic Stamp</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 print:mt-4">
          This is a computer generated invoice • Thank you for visiting {clinicName}
        </p>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';
