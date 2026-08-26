'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Banknote, Calendar, Clock } from 'lucide-react';

interface PayrollRecord {
  userRole: string;
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
  rcTotalFinalSalary: string | null;
  rcTotalDaysWorked: string | null;
  rcRegularEarning: string | null;
  rcOvertimeEarning: string | null;
  rcWeeklyBonusesTotal: string | null;
}

function fmt(value: string | null | undefined): string {
  return value ?? '0';
}

export default function MyPayrollPage() {
  const { sessionClaims, userId } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const [payroll, setPayroll] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payroll/monthly?userId=${userId}&clinicId=${clinicId}&month=${month}&year=${year}`
        );
        const data = await res.json();
        if (!cancelled) setPayroll(data.payroll || null);
      } catch (error) {
        console.error('Error fetching payroll:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, clinicId, month, year]);

  const role = payroll?.userRole || 'GENERAL_DOCTOR';
  const isDoctor = role === 'GENERAL_DOCTOR' || role === 'CLINIC_ADMIN';
  const isReceptionist = role === 'RECEPTIONIST';

  const formatMoney = (value: string | null | undefined) =>
    `₹${Number(fmt(value)).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Payroll</h1>
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !payroll ? (
        <div className="text-center py-12 text-gray-500">
          <Banknote className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>
            No payroll record found for {month}/{year}
          </p>
          <p className="text-sm mt-1">Run the monthly payroll generation as admin first</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Salary</span>
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold mt-2">
                {formatMoney(
                  isDoctor
                    ? payroll.gdTotalFinalSalary
                    : isReceptionist
                      ? payroll.rcTotalFinalSalary
                      : payroll.adTotalFinalSalary
                )}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Days Worked</span>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold mt-2">
                {isDoctor
                  ? fmt(payroll.gdTotalDaysWorked)
                  : isReceptionist
                    ? fmt(payroll.rcTotalDaysWorked)
                    : fmt(payroll.adTotalDaysWorked)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-xl font-bold mt-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    payroll.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {payroll.status || 'DRAFT'}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Breakdown</h3>
            <div className="space-y-3">
              {isDoctor ? (
                <>
                  <Row label="Base Salary" value={formatMoney(payroll.gdAccumulatedSalary)} />
                  <Row label="Sunday Earnings" value={formatMoney(payroll.gdSundayEarning)} />
                  <Row label="Referral Incentives" value={formatMoney(payroll.gdReferralIncentivesTotal)} />
                  <Row label="Monthly Bonus" value={formatMoney(payroll.gdMonthlyTargetBonus)} />
                  <div className="flex justify-between pt-2 font-bold text-lg border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatMoney(payroll.gdTotalFinalSalary)}
                    </span>
                  </div>
                </>
              ) : isReceptionist ? (
                <>
                  <Row label="Regular Earnings" value={formatMoney(payroll.rcRegularEarning)} />
                  <Row label="Overtime Pay" value={formatMoney(payroll.rcOvertimeEarning)} />
                  <Row label="Weekly Bonuses" value={formatMoney(payroll.rcWeeklyBonusesTotal)} />
                  <div className="flex justify-between pt-2 font-bold text-lg border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatMoney(payroll.rcTotalFinalSalary)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Row label="Regular Earnings" value={formatMoney(payroll.adRegularEarning)} />
                  <Row label="Sunday Earnings" value={formatMoney(payroll.adSundayEarning)} />
                  <Row label="Weekly Bonuses" value={formatMoney(payroll.adWeeklyBonusesTotal)} />
                  <Row label="Sunday Task Incentives" value={formatMoney(payroll.adSundayTaskIncentivesTotal)} />
                  <div className="flex justify-between pt-2 font-bold text-lg border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatMoney(payroll.adTotalFinalSalary)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}