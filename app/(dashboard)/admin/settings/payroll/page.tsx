'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Banknote, Save } from 'lucide-react';

const DEFAULT_SETTINGS = {
  generalDoctorBaseDailyPay: 2000,
  generalDoctorDailyWorkHours: 7,
  generalDoctorDailyRevenueTarget: 20000,
  generalDoctorMonthlyRevenueTarget: 600000,
  generalDoctorMonthlyTargetCap: 100000,
  assistantMonthlyBasePay: 18000,
  assistantDailyWorkHours: 8,
  workingDaysPerMonth: 26,
  referralIncentiveAmount: 1500,
  weeklyAttendanceBonusAmount: 500,
};

type SettingsKey = keyof typeof DEFAULT_SETTINGS;

const GENERAL_DOCTOR_FIELDS: { key: SettingsKey; label: string; prefix?: string; hint?: string }[] = [
  { key: 'generalDoctorBaseDailyPay', label: 'Base Daily Pay', prefix: '₹' },
  { key: 'generalDoctorDailyWorkHours', label: 'Daily Work Hours', hint: 'hours' },
  { key: 'generalDoctorDailyRevenueTarget', label: 'Daily Revenue Target', prefix: '₹', hint: 'Triggers 2× multiplier' },
  { key: 'generalDoctorMonthlyRevenueTarget', label: 'Monthly Revenue Target', prefix: '₹', hint: 'Triggers monthly cap bonus' },
  { key: 'generalDoctorMonthlyTargetCap', label: 'Monthly Target Cap', prefix: '₹', hint: 'Max monthly salary' },
];

const ASSISTANT_FIELDS: { key: SettingsKey; label: string; prefix?: string; hint?: string }[] = [
  { key: 'assistantMonthlyBasePay', label: 'Monthly Base Pay', prefix: '₹' },
  { key: 'assistantDailyWorkHours', label: 'Daily Work Hours', hint: 'hours' },
];

const COMMON_FIELDS: { key: SettingsKey; label: string; prefix?: string; hint?: string }[] = [
  { key: 'workingDaysPerMonth', label: 'Working Days / Month', hint: 'days' },
  { key: 'referralIncentiveAmount', label: 'Referral Incentive', prefix: '₹', hint: 'Per referral' },
  { key: 'weeklyAttendanceBonusAmount', label: 'Weekly Attendance Bonus', prefix: '₹', hint: 'For assistants who work all 6 days' },
];

function Field({
  label,
  value,
  onChange,
  prefix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
        <input
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
    </div>
  );
}

export default function PayrollSettingsPage() {
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const role = String(sessionClaims?.role || '');
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'SUPER_ADMIN') return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/payroll?clinicId=${clinicId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || 'Failed to load settings');
          return;
        }
        const settings = data.settings || DEFAULT_SETTINGS;
        const next: Record<string, string> = {};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          const value = settings[key];
          next[key] = value === undefined || value === null ? String((DEFAULT_SETTINGS as Record<string, number>)[key]) : String(value);
        }
        setValues(next);
      } catch {
        if (!cancelled) setError('Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, role]);

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, ...values }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Payroll settings updated');
      } else {
        setError(data.error || 'Failed to update payroll settings');
      }
    } catch {
      setError('Failed to update payroll settings');
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
        <p className="text-lg font-medium">No Permission</p>
        <p className="text-sm mt-1">Only Super Admin can access payroll settings.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-green-600" /> Payroll & Compensation Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure doctor pay, work hours, revenue targets, and bonuses. Changes apply to the
          next payroll run.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Doctors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GENERAL_DOCTOR_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              prefix={f.prefix}
              hint={f.hint}
              value={values[f.key] ?? ''}
              onChange={(v) => setValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assistant Doctors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ASSISTANT_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              prefix={f.prefix}
              hint={f.hint}
              value={values[f.key] ?? ''}
              onChange={(v) => setValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMMON_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              prefix={f.prefix}
              hint={f.hint}
              value={values[f.key] ?? ''}
              onChange={(v) => setValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push('/admin/settings')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
