'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Package,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  CheckCircle2,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import { clinicName } from '@/lib/constants/clinics';

interface Summary {
  date: string;
  patientsSeen: number;
  newRegistrations: number;
  walkIns: number;
  labOrders: number;
  purchaseOrders: number;
  revenue: number;
}

interface Expenses {
  inflows: { cash: number; gpay: number; card: number; other: number; total: number };
  outflows: { lab: number; vendor: number; total: number };
  net: number;
}

interface ActivityLog {
  logId: string;
  type: string;
  message: string;
  userName: string;
  userRole: string | null;
  createdAt: string;
}

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expenses | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [selectedClinic, setSelectedClinic] = useState('both');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, expensesRes, activityRes] = await Promise.all([
          fetch(`/api/admin/dashboard/summary?clinicId=${selectedClinic}&date=${selectedDate}`),
          fetch(`/api/admin/dashboard/expenses?clinicId=${selectedClinic}&date=${selectedDate}`),
          fetch(`/api/admin/dashboard/activity-feed?clinicId=${selectedClinic}&date=${selectedDate}&limit=30`),
        ]);

        const [summaryData, expensesData, activityData] = await Promise.all([
          summaryRes.json(),
          expensesRes.json(),
          activityRes.json(),
        ]);

        if (!cancelled) {
          if (summaryRes.ok) setSummary(summaryData);
          if (expensesRes.ok) setExpenses(expensesData);
          if (activityRes.ok) setActivity(activityData.logs || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedClinic]);

  const changeDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00.000Z`);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateInput(d));
  };

  const formatMoney = (value: number | undefined) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const cards = [
    { label: 'Patients Seen', value: summary?.patientsSeen ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: 'New Registrations', value: summary?.newRegistrations ?? 0, icon: UserPlus, color: 'bg-green-500' },
    { label: 'Walk-ins', value: summary?.walkIns ?? 0, icon: Activity, color: 'bg-purple-500' },
    { label: 'Revenue', value: formatMoney(summary?.revenue), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Lab Orders', value: summary?.labOrders ?? 0, icon: FlaskConical, color: 'bg-yellow-500' },
    { label: 'Purchase Orders', value: summary?.purchaseOrders ?? 0, icon: Package, color: 'bg-orange-500' },
  ];

  const activityMeta: Record<string, { icon: typeof Activity; color: string }> = {
    PATIENT_CHECKIN: { icon: CheckCircle2, color: 'text-blue-500' },
    APPOINTMENT_COMPLETED: { icon: Calendar, color: 'text-indigo-500' },
    PAYMENT_RECORDED: { icon: CreditCard, color: 'text-green-500' },
    LAB_ORDER_SENT: { icon: FlaskConical, color: 'text-yellow-500' },
    LAB_STAGE_COMPLETED: { icon: Activity, color: 'text-teal-500' },
    PURCHASE_ORDER_PLACED: { icon: ShoppingCart, color: 'text-orange-500' },
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="both">Both Clinics</option>
            <option value="clinic_a">Clinic A</option>
            <option value="clinic_b">Clinic B</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedDate(toDateInput(new Date()))}
              className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{card.label}</span>
                    <div className={`p-1.5 rounded-full ${card.color} bg-opacity-10`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2">{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expense Overview */}
            <div className="bg-white rounded-lg shadow p-5 lg:col-span-1">
              <h3 className="font-semibold text-gray-700 mb-3">
                Expense Overview — {clinicName(selectedClinic === 'both' ? null : selectedClinic)}
              </h3>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Inflows</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cash</span>
                      <span className="font-medium">{formatMoney(expenses?.inflows.cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPay/Paytm</span>
                      <span className="font-medium">{formatMoney(expenses?.inflows.gpay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card</span>
                      <span className="font-medium">{formatMoney(expenses?.inflows.card)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other</span>
                      <span className="font-medium">{formatMoney(expenses?.inflows.other)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total</span>
                      <span className="text-green-600">{formatMoney(expenses?.inflows.total)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Outflows</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Lab Payments</span>
                      <span className="font-medium">{formatMoney(expenses?.outflows.lab)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vendor Payments</span>
                      <span className="font-medium">{formatMoney(expenses?.outflows.vendor)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total</span>
                      <span className="text-red-600">{formatMoney(expenses?.outflows.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-sm font-medium text-gray-600">Net</p>
                  <p
                    className={`text-xl font-bold ${
                      (expenses?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatMoney(expenses?.net)}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-lg shadow p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-700 mb-3">
                Activity Feed — {selectedDate}
              </h3>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-500">No activity for this date.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activity.map((log) => {
                    const meta = activityMeta[log.type] || { icon: Activity, color: 'text-gray-500' };
                    const Icon = meta.icon;
                    return (
                      <div key={log.logId} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md">
                        <Icon className={`h-4 w-4 mt-1 ${meta.color}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800">{log.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{log.userName || 'Staff'}</span>
                            <span>•</span>
                            <span>{formatTime(log.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
