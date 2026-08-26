'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Plus, FlaskConical, Pencil } from 'lucide-react';

interface LabOrder {
  orderId: string;
  labId: string;
  labName: string;
  patientId: string;
  patientName: string;
  orderedByDoctorName: string;
  workDescription: string;
  workType: string | null;
  shade: string | null;
  totalAmount: string | null;
  status: string;
  stages: Array<{ status: string }>;
  createdAt: string;
}

interface Stats {
  totalOrders: number;
  totalAmount: number;
  byWorkType: Array<{ name: string; count: number; total: number }>;
  byLab: Array<{ name: string; count: number; total: number }>;
  byStatus: Record<string, number>;
  avgStageCompletionHours: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-500';
}

export default function LabOrdersPage() {
  const { sessionClaims } = useAuth();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [labFilter, setLabFilter] = useState('all');
  const [labs, setLabs] = useState<Array<{ labId: string; name: string }>>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const role = (sessionClaims?.role as string) || '';

  const isDoctor = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR'].includes(role);

  useEffect(() => {
    let cancelled = false;
    const loadLabs = async () => {
      try {
        const res = await fetch('/api/labs?active=true');
        const data = await res.json();
        if (!cancelled) setLabs(data.labs || []);
      } catch (error) {
        console.error('Error fetching labs:', error);
      }
    };
    loadLabs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let url = `/api/lab-orders?clinicId=${clinicId}`;
        if (statusFilter !== 'all') {
          url += `&status=${statusFilter}`;
        }
        if (labFilter !== 'all') {
          url += `&labId=${encodeURIComponent(labFilter)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching lab orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, statusFilter, labFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        let url = `/api/lab-orders/stats?clinicId=${clinicId}`;
        if (statusFilter !== 'all') url += `&status=${statusFilter}`;
        if (labFilter !== 'all') url += `&labId=${encodeURIComponent(labFilter)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled && !data.error) setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [clinicId, statusFilter, labFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Lab Orders
            {labFilter !== 'all' && labs.find((l) => l.labId === labFilter) && (
              <span className="ml-2 text-lg font-normal text-gray-500">
                — {labs.find((l) => l.labId === labFilter)?.name}
              </span>
            )}
          </h1>
          {labFilter !== 'all' && (
            <p className="text-sm text-gray-500 mt-1">
              Filtered by lab •{' '}
              <button onClick={() => setLabFilter('all')} className="text-blue-600 hover:underline">
                Clear lab filter
              </button>
            </p>
          )}
        </div>
        {isDoctor && (
          <Link
            href="/lab-orders/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Lab Order
          </Link>
        )}
      </div>

      {/* Analytics Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Total Orders</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Total Amount</p>
            <p className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.byStatus.PENDING || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus.IN_PROGRESS || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus.COMPLETED || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Avg Stage Time</p>
            <p className="text-2xl font-bold">
              {stats.avgStageCompletionHours !== null
                ? `${stats.avgStageCompletionHours.toFixed(1)}h`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {stats && (stats.byWorkType.length > 0 || stats.byLab.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Work Types</h3>
            <div className="space-y-1">
              {stats.byWorkType.map((wt) => (
                <div key={wt.name} className="flex justify-between text-sm">
                  <span>{wt.name}</span>
                  <span className="text-gray-500">
                    {wt.count} • ₹{wt.total.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {stats.byWorkType.length === 0 && <p className="text-xs text-gray-400">No data</p>}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Labs</h3>
            <div className="space-y-1">
              {stats.byLab.map((lab) => (
                <div key={lab.name} className="flex justify-between text-sm">
                  <span>{lab.name}</span>
                  <span className="text-gray-500">
                    {lab.count} • ₹{lab.total.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {stats.byLab.length === 0 && <p className="text-xs text-gray-400">No data</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'IN_PROGRESS', label: 'In Progress' },
            { key: 'COMPLETED', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                statusFilter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Lab:</label>
          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white min-w-[160px]"
          >
            <option value="all">All Labs</option>
            {labs.map((lab) => (
              <option key={lab.labId} value={lab.labId}>
                {lab.name}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter !== 'all' || labFilter !== 'all') && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setLabFilter('all');
            }}
            className="text-sm text-gray-500 hover:text-gray-700 ml-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FlaskConical className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No lab orders found</p>
          {isDoctor && (
            <Link href="/lab-orders/new" className="text-blue-600 hover:underline">
              Create your first lab order
            </Link>
          )}
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
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lab
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Work Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stages
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const completedStages = order.stages.filter((s) => s.status === 'COMPLETED').length;
                const totalStages = order.stages.length;
                return (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/lab-orders/${order.orderId}`} className="text-blue-600 hover:underline">
                        {order.orderId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.labName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.workType || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.shade ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: '#fff' }} />
                          {order.shade}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {order.totalAmount ? `₹${Number(order.totalAmount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.orderedByDoctorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full text-white ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {completedStages}/{totalStages}
                    </td>
                    {isDoctor && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/lab-orders/${order.orderId}/edit`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </Link>
                      </td>
                    )}
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