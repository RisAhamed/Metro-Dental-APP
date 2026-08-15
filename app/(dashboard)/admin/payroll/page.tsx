'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Banknote, Download, RefreshCw } from 'lucide-react';
import { exportPayrollToExcel } from '@/lib/utils/exportExcel';
import * as XLSX from 'xlsx';

interface PayrollRecord {
  payrollId: string;
  userName: string;
  userRole: string;
  clinicId: string;
  status: string;
  gdTotalFinalSalary: string | null;
  gdTotalDaysWorked: string | null;
  gdAccumulatedSalary: string | null;
  gdSundayEarning: string | null;
  gdReferralIncentivesTotal: string | null;
  gdMonthlyTargetBonus: string | null;
  adTotalFinalSalary: string | null;
  adTotalDaysWorked: string | null;
  adRegularEarning: string | null;
  adSundayEarning: string | null;
  adWeeklyBonusesTotal: string | null;
  adSundayTaskIncentivesTotal: string | null;
}

function fmt(value: string | null | undefined): string {
  return value ?? '0';
}

export default function AdminPayrollPage() {
  const { sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payroll/list?clinicId=${clinicId}&month=${month}&year=${year}`
        );
        const data = await res.json();
        if (!cancelled) setRecords(data.records || []);
      } catch (error) {
        console.error('Error loading payroll:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, month, year]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/payroll/list?clinicId=${clinicId}&month=${month}&year=${year}`
      );
      const data = await res.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Error reloading payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, month, year }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Payroll generated');
        loadRecords();
      } else {
        alert(data.error || 'Failed to generate payroll');
      }
      } catch {
        alert('An error occurred');
      } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    const wb = exportPayrollToExcel(records, month, year);
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const name = `Payroll_${month}_${year}.xlsx`;
    const url = URL.createObjectURL(
      new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMoney = (value: string | null | undefined) =>
    `₹${Number(fmt(value)).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payroll</h1>
        <div className="flex items-center gap-2">
          <select
            className="w-20 border border-gray-300 rounded-md px-2 py-1"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="w-24 border border-gray-300 rounded-md px-2 py-1"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <Banknote className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No payroll for {month}/{year}</p>
          <p className="text-sm mt-1">Click Generate to create payroll for all staff</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sunday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bonus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((p) => {
                const isDoctor = p.userRole === 'GENERAL_DOCTOR' || p.userRole === 'CLINIC_ADMIN';
                return (
                  <tr key={p.payrollId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.userRole}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isDoctor ? fmt(p.gdTotalDaysWorked) : fmt(p.adTotalDaysWorked)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatMoney(isDoctor ? p.gdAccumulatedSalary : p.adRegularEarning)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatMoney(isDoctor ? p.gdSundayEarning : p.adSundayEarning)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatMoney(
                        isDoctor ? p.gdMonthlyTargetBonus : p.adWeeklyBonusesTotal
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatMoney(isDoctor ? p.gdTotalFinalSalary : p.adTotalFinalSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          p.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}