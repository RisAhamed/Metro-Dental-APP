'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

const A4_WIDTH_PX = 794;
const PDF_MARGIN_MM = 12;
const PDF_DPI = 96;
const MM_PER_INCH = 25.4;

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
  const pdfRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfRef.current || !invoice) return;
    setDownloading(true);

    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      // The pdfRef is a hidden but in-flow container at fixed A4 width.
      // html-to-image can compute its styles because it's in the DOM layout.
      const imgData = await toPng(pdfRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // Load the captured image
      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load captured image'));
      });

      // Calculate dimensions
      const marginMM = PDF_MARGIN_MM;
      const marginPX = (marginMM / MM_PER_INCH) * PDF_DPI;
      const printableWidthPX = A4_WIDTH_PX - marginPX * 2;

      // The image was captured at 2x pixel ratio from a 794px-wide element
      // So img.width = 794 * 2 = 1588px
      // Scale factor: map captured width to printable A4 width
      const scaleX = printableWidthPX / img.width;
      const scaledHeight = img.height * scaleX;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidthMM = 210;
      const pageHeightMM = 297;
      const contentWidthMM = pageWidthMM - marginMM * 2;
      const contentHeightMM = pageHeightMM - marginMM * 2;

      // Convert scaled image height to mm
      const imageHeightMM = (scaledHeight / PDF_DPI) * MM_PER_INCH;

      // Calculate total pages
      const totalPages = Math.ceil(imageHeightMM / contentHeightMM);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const yOffsetMM = page * contentHeightMM;
        const srcWidthPX = img.width;
        const srcHeightPX = img.height;

        // Source Y offset in pixels
        const srcYOffsetPX = (yOffsetMM / imageHeightMM) * srcHeightPX;
        // Source slice height in pixels
        const srcSliceHeightPX = Math.min(
          (contentHeightMM / imageHeightMM) * srcHeightPX,
          srcHeightPX - srcYOffsetPX
        );
        // Destination slice height in mm
        const destSliceHeightMM = (srcSliceHeightPX / srcHeightPX) * imageHeightMM;

        // Slice the image for this page
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = srcWidthPX;
        sliceCanvas.height = srcSliceHeightPX;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            0, srcYOffsetPX, srcWidthPX, srcSliceHeightPX,
            0, 0, srcWidthPX, srcSliceHeightPX
          );

          const sliceData = sliceCanvas.toDataURL('image/png');
          pdf.addImage(sliceData, 'PNG', marginMM, marginMM, contentWidthMM, destSliceHeightMM);
        }
      }

      // Save with patient name + date
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const pdfPatientName = (invoice.patientName || 'patient').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      pdf.save(`${pdfPatientName}_${day}-${month}-${year}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }, [invoice]);

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

      {/* Payment status badge */}
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

      {/* On-screen invoice (responsive) */}
      <div className="bg-white rounded-lg shadow print:shadow-none print:border-none">
        <InvoicePrint
          ref={printRef}
          invoice={invoice as unknown as Parameters<typeof InvoicePrint>[0]['invoice']}
          patient={patient as unknown as Parameters<typeof InvoicePrint>[0]['patient']}
          clinic={clinic as unknown as Parameters<typeof InvoicePrint>[0]['clinic']}
        />
      </div>

      {/* Hidden PDF capture container — fixed A4 width, in-flow for html-to-image */}
      <div
        ref={pdfRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${A4_WIDTH_PX}px`,
          maxWidth: `${A4_WIDTH_PX}px`,
          overflow: 'hidden',
          background: 'white',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <InvoicePrint
          invoice={invoice as unknown as Parameters<typeof InvoicePrint>[0]['invoice']}
          patient={patient as unknown as Parameters<typeof InvoicePrint>[0]['patient']}
          clinic={clinic as unknown as Parameters<typeof InvoicePrint>[0]['clinic']}
          pdfMode
        />
      </div>
    </div>
  );
}
