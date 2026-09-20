'use client';

import { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import type { PrescriptionMedicine } from '@/lib/db/schema/prescriptions';

interface PrescriptionPrintProps {
  prescription: {
    prescriptionId: string;
    date: string;
    doctorName: string | null;
    notes: string | null;
    medicines: PrescriptionMedicine[];
  };
  patient: {
    patientId: string;
    name: string;
    age: number | null;
    gender: string;
    primaryPhone: string;
  };
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export function PrescriptionPrint({ prescription, patient, clinic }: PrescriptionPrintProps) {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(img, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(img, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${prescription.prescriptionId}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #prescription-print-area, #prescription-print-area * { visibility: visible; }
          #prescription-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-end gap-2">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          <Printer className="h-4 w-4" /> Print
        </button>
        <button onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
          <Download className="h-4 w-4" /> {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      <div id="prescription-print-area" ref={printRef} className="bg-white p-10 text-gray-900 shadow print:shadow-none">
        <header className="border-b border-gray-300 pb-4 text-center">
          <h1 className="text-2xl font-bold tracking-wide">{clinic?.name || 'METRO DENTAL CLINIC'}</h1>
          <p className="mt-1 text-sm text-gray-600">{[clinic?.address, clinic?.phone, clinic?.email].filter(Boolean).join(' | ')}</p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-y-2 text-sm">
          <p><span className="font-semibold">Doctor:</span> {prescription.doctorName ? `Dr. ${prescription.doctorName}` : '-'}</p>
          <p className="text-right"><span className="font-semibold">Date:</span> {new Date(prescription.date).toLocaleDateString('en-IN')}</p>
          <p><span className="font-semibold">Reg. No:</span> -</p>
          <p className="text-right"><span className="font-semibold">RX #:</span> {prescription.prescriptionId}</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-y-2 rounded-md border border-gray-300 p-3 text-sm">
          <p><span className="font-semibold">Patient:</span> {patient.name}</p>
          <p className="text-right"><span className="font-semibold">ID:</span> {patient.patientId}</p>
          <p><span className="font-semibold">Age:</span> {patient.age ?? '-'} <span className="ml-4 font-semibold">Gender:</span> {patient.gender}</p>
          <p className="text-right"><span className="font-semibold">Phone:</span> {patient.primaryPhone}</p>
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-xs uppercase">
              <th className="border border-gray-300 p-2">#</th>
              <th className="border border-gray-300 p-2">Drug Name</th>
              <th className="border border-gray-300 p-2">Strength</th>
              <th className="border border-gray-300 p-2">Duration</th>
              <th className="border border-gray-300 p-2">M</th>
              <th className="border border-gray-300 p-2">N</th>
              <th className="border border-gray-300 p-2">N</th>
              <th className="border border-gray-300 p-2">Food</th>
            </tr>
          </thead>
          <tbody>
            {prescription.medicines.map((m, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2">{i + 1}</td>
                <td className="border border-gray-300 p-2 font-medium">{m.drugName}</td>
                <td className="border border-gray-300 p-2">{[m.strength, m.strengthUnit].filter(Boolean).join(' ') || '-'}</td>
                <td className="border border-gray-300 p-2">{[m.duration, m.durationUnit].filter(Boolean).join(' ') || '-'}</td>
                <td className="border border-gray-300 p-2">{m.morning || '0'}</td>
                <td className="border border-gray-300 p-2">{m.noon || '0'}</td>
                <td className="border border-gray-300 p-2">{m.night || '0'}</td>
                <td className="border border-gray-300 p-2">{m.beforeAfterFood || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(prescription.notes || prescription.medicines.some((m) => m.instruction)) && (
          <section className="mt-6 text-sm">
            <h2 className="mb-2 font-semibold">Notes:</h2>
            <ul className="list-disc space-y-1 pl-5">
              {prescription.medicines.filter((m) => m.instruction).map((m, i) => <li key={i}>{m.instruction}</li>)}
              {prescription.notes && <li>{prescription.notes}</li>}
            </ul>
          </section>
        )}

        <div className="mt-16 flex justify-end">
          <div className="text-center text-sm">
            <div className="mb-2 h-px w-56 bg-gray-400" />
            Doctor&apos;s Signature
          </div>
        </div>
      </div>
    </div>
  );
}
