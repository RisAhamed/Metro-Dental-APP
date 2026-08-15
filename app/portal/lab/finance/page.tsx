'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Banknote, IndianRupee, AlertTriangle } from 'lucide-react';

interface FinanceOrder {
  orderId: string;
  clinicId: string;
  patientName: string;
  orderedByDoctorName: string;
  status: string;
  createdAt: string;
  totalCost: number;
  amountPaid: number;
  paymentStatus: string;
}

interface FinanceResponse {
  orders: FinanceOrder[];
  totals: { billed: number; paid: number; outstanding: number };
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
  UNPAID: 'bg-red-100 text-red-700',
};

export default function LabFinancePage() {
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState('both');
  const [paymentStatus, setPaymentStatus] = useState('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (clinicId !== 'both') params.set('clinicId', clinicId);
        if (paymentStatus !== 'all') params.set('paymentStatus', paymentStatus);
        const res = await fetch(`/api/lab-orders/finance?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (error) {
        console.error('Error fetching finance:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, paymentStatus]);

  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const totals = data?.totals || { billed: 0, paid: 0, outstanding: 0 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lab Finance</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-700">Total Billed</h3>
          </div>
          <p className="text-2xl font-bold">{fmt(totals.billed)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-700">Amount Paid Back</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(totals.paid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-700">Outstanding</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">{fmt(totals.outstanding)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Clinic</label>
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="both">Both Clinics</option>
            <option value="clinic_a">Clinic A</option>
            <option value="clinic_b">Clinic B</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !data || data.orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">
          No orders match the selected filters.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Paid
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.orders.map((order) => {
                const balance = Math.max(0, order.totalCost - order.amountPaid);
                return (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/portal/lab/orders/${order.orderId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {order.orderId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.clinicId === 'clinic_a' ? 'Clinic A' : 'Clinic B'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full text-white ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-500'
                            : order.status === 'IN_PROGRESS'
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {fmt(order.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                      {fmt(order.amountPaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">
                      {fmt(balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          PAYMENT_STATUS_STYLES[order.paymentStatus] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {order.paymentStatus}
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
