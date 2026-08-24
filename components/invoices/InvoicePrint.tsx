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
  doctorName?: string | null;
  doctorRegistration?: string | null;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ invoice, patient, clinic, doctorName }, ref) => {
    const clinicName = clinic?.name || 'Metro Dental Clinic';
    const clinicAddress = clinic?.address || 'Clinic Address, Phone, Email';
    const clinicPhone = clinic?.phone;
    const clinicEmail = clinic?.email;

    return (
      <div
        ref={ref}
        id="invoice-print-area"
        className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto print:p-0 print:shadow-none"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Print styles - isolate invoice */}
        <style>{`
          @media print {
            @page { size: A4; margin: 12mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
            body * { visibility: hidden; }
            #invoice-print-area, #invoice-print-area * { visibility: visible; }
            #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; margin: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* Clinic Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold tracking-wide uppercase">{clinicName}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {[clinicAddress, clinicPhone, clinicEmail].filter(Boolean).join(' • ')}
          </p>
        </div>

        {/* Doctor Info */}
        <div className="flex justify-between text-sm mt-4 pb-4 border-b border-gray-200">
          <div>
            <p>
              <span className="font-semibold">Doctor:</span> {doctorName ? `Dr. ${doctorName}` : `Dr. ${invoice.createdBy}`}
            </p>
            <p className="text-gray-600 text-xs mt-0.5">General Dentistry</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Reg. No.: —</p>
            {clinicPhone && <p className="text-xs text-gray-500">Contact: {clinicPhone}</p>}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="flex justify-between mt-4 text-sm">
          <div>
            <p>
              <span className="font-semibold">INVOICE #:</span> {invoice.invoiceNumber}
            </p>
          </div>
          <div>
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
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="font-semibold">Patient Name:</span> {patient?.name || invoice.patientName}
            </p>
            <p>
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
        <div className="mt-6">
          <table className="w-full text-sm border-collapse">
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
                <tr key={`${proc.procedureId}-${idx}`} className="border-b border-gray-200">
                  <td className="py-2.5 px-3 text-sm">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="text-sm font-medium">{proc.procedureName}</p>
                    {proc.toothNumbers && proc.toothNumbers.length > 0 && (
                      <p className="text-xs text-gray-500">Teeth: [{proc.toothNumbers.join('] [')}]</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm">{proc.qty}</td>
                  <td className="py-2.5 px-3 text-right text-sm">₹{Number(proc.unitCost).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-sm font-semibold">₹{Number(proc.total).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">SUBTOTAL:</span>
              <span className="font-medium">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">DISCOUNT:</span>
              <span className="font-medium">₹{Number(invoice.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-base">
              <span>GRAND TOTAL:</span>
              <span>₹{Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1 text-xs">
              <span className="text-gray-600">Amount Paid:</span>
              <span>₹{Number(invoice.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mt-4">
          <p className="text-sm">
            <span className="font-semibold">Payment Status:</span>{' '}
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                invoice.paymentStatus === 'PAID'
                  ? 'bg-green-100 text-green-700'
                  : invoice.paymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {invoice.paymentStatus}
            </span>
          </p>
        </div>

        {/* Signature & Stamp */}
        <div className="mt-12 flex justify-between items-end">
          <div className="text-center">
            <div className="w-40 h-12 border-b border-gray-400 mb-1"></div>
            <p className="text-xs text-gray-600">Doctor&apos;s Signature</p>
          </div>
          <div className="text-center">
            <div className="w-32 h-16 border border-dashed border-gray-300 rounded flex items-center justify-center">
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
