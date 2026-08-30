'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download, CreditCard } from 'lucide-react';
import { InvoicePrint } from '@/components/invoices/InvoicePrint';

interface InvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  planId: string | null;
  procedures: Array<{
    procedureId: string;
    procedureName: string;
    qty: number;
    unitCost: number;
    discount: number;
    total: number;
    toothNumbers?: number[] | null;
    notes?: string | null;
  }>;
  subtotal: string;
  totalDiscount: string;
  grandTotal: string;
  amountPaid: string;
  paymentStatus: string;
  createdBy: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Array.isArray(params.invoiceId) ? params.invoiceId[0] : params.invoiceId || '';
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);
  const [clinic, setClinic] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const data = await res.json();
        if (res.ok) {
          setInvoice(data.invoice);
          setPatient(data.patient);
          setClinic(data.clinic);
        } else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (invoiceId) load();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !invoice) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const imgData = await toPng(printRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const patientName = (invoice.patientName || 'patient').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      pdf.save(`${patientName}_${day}-${month}-${year}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePaymentUpdate = async (status: string) => {
    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status }),
      });
      const data = await res.json();
      if (res.ok) setInvoice(data.invoice);
      else alert(data.error || 'Failed to update payment status');
    } catch {
      alert('Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading invoice...</div>;
  if (notFound || !invoice) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-600 mb-4">Invoice not found</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between print:hidden no-print">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <select
            value={invoice.paymentStatus}
            onChange={(e) => handlePaymentUpdate(e.target.value)}
            disabled={updatingPayment}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
            <option value="PAID">PAID</option>
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Payment status badge - visible on screen */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-2 print:hidden no-print">
        <CreditCard className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-medium">Payment Status:</span>
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
        <span className="text-sm text-gray-500 ml-auto">
          Amount Paid: ₹{Number(invoice.amountPaid).toLocaleString('en-IN')} / ₹{Number(invoice.grandTotal).toLocaleString('en-IN')}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow print:shadow-none print:border-none">
        <InvoicePrint
          ref={printRef}
          invoice={invoice as unknown as Parameters<typeof InvoicePrint>[0]['invoice']}
          patient={
            patient as unknown as Parameters<typeof InvoicePrint>[0]['patient']
          }
          clinic={
            clinic as unknown as Parameters<typeof InvoicePrint>[0]['clinic']
          }
        />
      </div>
    </div>
  );
}
