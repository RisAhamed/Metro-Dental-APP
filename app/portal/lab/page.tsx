'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Loader,
  Clock,
  IndianRupee,
  Banknote,
} from 'lucide-react';

interface ClinicStats {
  clinicId: string;
  clinicName: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  openIssues: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  amountPaid: number;
  amountOutstanding: number;
}

interface SummaryResponse {
  byClinic: Record<string, ClinicStats>;
  combined: ClinicStats;
}

export default function LabDashboardPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<'both' | 'clinic_a' | 'clinic_b'>(
    'both'
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/lab-orders/summary');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (error) {
        console.error('Error fetching lab summary:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Could not load dashboard.</p>
      </div>
    );
  }

  const stats: ClinicStats =
    selectedClinic === 'both'
      ? data.combined
      : data.byClinic[selectedClinic] || {
          clinicId: selectedClinic,
          clinicName: selectedClinic === 'clinic_a' ? 'Clinic A' : 'Clinic B',
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          openIssues: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
          amountPaid: 0,
          amountOutstanding: 0,
        };

  const cards = [
    { label: 'Total Orders', value: stats.total, icon: ClipboardList, color: 'text-gray-700' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
    { label: 'In Progress', value: stats.inProgress, icon: Loader, color: 'text-blue-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Open Issues', value: stats.openIssues, icon: AlertTriangle, color: 'text-red-600' },
  ];

  const financeCards = [
    { label: 'Fully Paid', value: stats.paidCount, color: 'text-green-600' },
    { label: 'Partially Paid', value: stats.partialCount, color: 'text-orange-600' },
    { label: 'Unpaid', value: stats.unpaidCount, color: 'text-red-600' },
  ];

  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Lab Dashboard</h1>
        <div className="flex items-center gap-2">
          {(['both', 'clinic_a', 'clinic_b'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setSelectedClinic(c)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                selectedClinic === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c === 'both' ? 'Both Clinics' : c === 'clinic_a' ? 'Clinic A' : 'Clinic B'}
            </button>
          ))}
        </div>
      </div>

      {/* Order status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-700">Amount Paid Back</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(stats.amountPaid)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {financeCards.map((c) => (
              <span
                key={c.label}
                className={`px-2 py-1 text-xs rounded-full bg-gray-100 ${c.color}`}
              >
                {c.label}: {c.value}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-700">Outstanding</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">{fmt(stats.amountOutstanding)}</p>
          <p className="text-xs text-gray-500 mt-2">
            Total billed minus amount paid across orders.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-gray-700">Needs Attention</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.openIssues}</p>
          <Link
            href={`/portal/lab/orders${selectedClinic === 'both' ? '' : `?clinicId=${selectedClinic}`}`}
            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
          >
            View orders →
          </Link>
        </div>
      </div>

      {/* Per-clinic quick stats */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-4">By Clinic</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(data.byClinic).map((c) => (
            <div key={c.clinicId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{c.clinicName}</p>
                <Link
                  href={`/portal/lab/orders?clinicId=${c.clinicId}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View orders →
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{c.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">{c.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{c.inProgress}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{c.completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{c.openIssues}</p>
                  <p className="text-xs text-gray-500">Open Issues</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{fmt(c.amountPaid)}</p>
                  <p className="text-xs text-gray-500">Paid</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
