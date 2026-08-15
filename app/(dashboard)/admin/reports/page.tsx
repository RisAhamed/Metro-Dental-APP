'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';

type ReportType =
  | 'payroll'
  | 'revenue'
  | 'attendance'
  | 'lab-cost'
  | 'inventory'
  | 'patient-payments';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'payroll', label: 'Payroll Report' },
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'attendance', label: 'Attendance Report' },
  { value: 'lab-cost', label: 'Lab Cost Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'patient-payments', label: 'Patient Payment Report' },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('payroll');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clinicId, setClinicId] = useState('both');
  const [error, setError] = useState('');

  const generateReport = async () => {
    setError('');
    let url = `/api/admin/reports/${reportType}?clinicId=${clinicId}`;

    if (reportType === 'payroll' || reportType === 'attendance' || reportType === 'lab-cost') {
      url += `&month=${month}&year=${year}`;
    } else if (reportType === 'revenue' || reportType === 'patient-payments') {
      if (!startDate || !endDate) {
        setError('Please select start and end dates');
        return;
      }
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    setLoading(true);
    try {
      // Trigger Excel download from the reports API (not page navigation).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = url;
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
      setLoading(false);
    }
  };

  const showMonthlyFields =
    reportType === 'payroll' || reportType === 'attendance' || reportType === 'lab-cost';
  const showDateRangeFields =
    reportType === 'revenue' || reportType === 'patient-payments';
  const showNoDateFields = reportType === 'inventory';

  const inputClass =
    'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className={inputClass}
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clinic */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Clinic</label>
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className={inputClass}
          >
            <option value="both">Both Clinics</option>
            <option value="clinic_a">Clinic A</option>
            <option value="clinic_b">Clinic B</option>
          </select>
        </div>

        {/* Monthly Fields */}
        {showMonthlyFields && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className={inputClass}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className={inputClass}
                min={2024}
                max={2035}
              />
            </div>
          </div>
        )}

        {/* Date Range Fields */}
        {showDateRangeFields && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {showNoDateFields && (
          <p className="text-sm text-gray-500">
            This report shows current inventory across all items.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          {loading ? 'Generating...' : 'Generate & Download Report'}
        </button>
      </div>

      {/* Report Descriptions */}
      <div className="mt-4 text-sm text-gray-500">
        <p className="font-medium flex items-center gap-1">
          <FileSpreadsheet className="h-4 w-4" /> Available Reports:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>
            <span className="font-medium">Payroll</span> — Staff salaries for a month (Excel)
          </li>
          <li>
            <span className="font-medium">Revenue</span> — Payments received with running totals
          </li>
          <li>
            <span className="font-medium">Attendance</span> — Staff attendance for a month
          </li>
          <li>
            <span className="font-medium">Lab Cost</span> — Lab orders with costs and balances
          </li>
          <li>
            <span className="font-medium">Inventory</span> — Current stock levels and prices
          </li>
          <li>
            <span className="font-medium">Patient Payment</span> — Payments with running totals
          </li>
        </ul>
      </div>
    </div>
  );
}
