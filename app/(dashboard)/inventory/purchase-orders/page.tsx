'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart, ArrowLeft } from 'lucide-react';

interface PurchaseOrder {
  orderId: string;
  poNumber: string;
  vendorName: string;
  orderDate: string;
  netAmount: string;
  balanceDue: string;
  status: string;
  paymentStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PARTIALLY_DELIVERED: 'bg-blue-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-800',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let url = '/api/purchase-orders';
        if (statusFilter !== 'all') url += `?status=${statusFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
        </div>
        <Link
          href="/inventory/purchase-orders/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All' },
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
          <p>No purchase orders found</p>
          <Link href="/inventory/purchase-orders/new" className="text-blue-600 hover:underline">
            Create your first order
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/inventory/purchase-orders/${order.orderId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.poNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.vendorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.orderDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ₹{Number(order.netAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ₹{Number(order.balanceDue || 0).toLocaleString('en-IN')}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        PAYMENT_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
