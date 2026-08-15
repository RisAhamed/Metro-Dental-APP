'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ShoppingCart, AlertCircle, Truck } from 'lucide-react';

interface PurchaseOrder {
  orderId: string;
  poNumber: string;
  clinicId: string;
  lineItems: Array<{ itemName: string }>;
  netAmount: string;
  status: string;
  expectedDeliveryDate: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PARTIALLY_DELIVERED: 'bg-blue-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const CLINIC_NAMES: Record<string, string> = {
  clinic_a: 'Clinic A',
  clinic_b: 'Clinic B',
  clinic_c: 'Clinic C',
};

export default function VendorPortalOrdersPage() {
  const { sessionClaims } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorId, setVendorId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let url = '/api/purchase-orders/vendor';
        if (statusFilter !== 'all') url += `?status=${statusFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) {
          setOrders(data.orders || []);
          setVendorId(data.vendorId || '');
        }
      } catch (error) {
        console.error('Error fetching vendor orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  if (!sessionClaims) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-sm text-gray-500">Vendor ID: {vendorId || '-'}</div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'PARTIALLY_DELIVERED', label: 'Partial' },
          { key: 'DELIVERED', label: 'Delivered' },
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const isPending = order.status === 'PENDING' || order.status === 'PARTIALLY_DELIVERED';
                return (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/portal/vendor/orders/${order.orderId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {order.poNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {CLINIC_NAMES[order.clinicId] || order.clinicId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.lineItems?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      ₹{Number(order.netAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full text-white ${
                          STATUS_COLORS[order.status] || 'bg-gray-500'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isPending ? (
                        <Link
                          href={`/portal/vendor/orders/${order.orderId}`}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Truck className="h-3 w-3" /> Update Delivery
                        </Link>
                      ) : (
                        <Link
                          href={`/portal/vendor/orders/${order.orderId}`}
                          className="text-gray-600 hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orders.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="h-4 w-4" />
          Update delivery status and upload invoices from each order.
        </div>
      )}
    </div>
  );
}
