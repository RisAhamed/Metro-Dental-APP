'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, Truck, Package } from 'lucide-react';

interface LineItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantityOrdered: number;
  quantityDelivered: number;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrder {
  orderId: string;
  poNumber: string;
  vendorName: string;
  clinicId: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  deliveredDate: string | null;
  status: string;
  lineItems: LineItem[];
  invoiceFileId: string | null;
  netAmount: string;
  notes: string | null;
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

export default function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deliveredQty, setDeliveredQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { orderId } = await params;
        const res = await fetch(`/api/purchase-orders/vendor/${orderId}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.order) {
            setOrder(data.order);
            const qtyMap: Record<string, number> = {};
            for (const li of data.order.lineItems || []) {
              qtyMap[li.itemId] = li.quantityDelivered || 0;
            }
            setDeliveredQty(qtyMap);
          } else {
            setError('Order not found');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading order:', err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const updateDelivery = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    setError('');

    const lineItems = order.lineItems.map((li) => ({
      ...li,
      quantityDelivered: deliveredQty[li.itemId] || 0,
    }));

    const allDelivered = lineItems.every(
      (li) => li.quantityDelivered >= li.quantityOrdered
    );
    const anyDelivered = lineItems.some((li) => li.quantityDelivered > 0);
    const status = allDelivered ? 'DELIVERED' : anyDelivered ? 'PARTIALLY_DELIVERED' : 'PENDING';

    const res = await fetch('/api/purchase-orders/vendor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId, lineItems, status }),
    });
    const data = await res.json();
    if (res.ok) {
      const orderRes = await fetch(`/api/purchase-orders/vendor/${order.orderId}`);
      const orderData = await orderRes.json();
      if (orderData.order) {
        setOrder(orderData.order);
      }
    } else {
      setError(data.error || 'Failed to update delivery');
    }
    setSaving(false);
  };

  const handleInvoiceUpload = async (file: File) => {
    if (!order) return;
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const uploadRes = await fetch('/api/upload/invoice', { method: 'POST', body: fd });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.fileId) {
      setError(uploadData.error || 'Upload failed');
      return;
    }

    const res = await fetch('/api/purchase-orders/vendor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        lineItems: order.lineItems,
        status: order.status,
        invoiceFileId: uploadData.fileId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const orderRes = await fetch(`/api/purchase-orders/vendor/${order.orderId}`);
      const orderData = await orderRes.json();
      if (orderData.order) setOrder(orderData.order);
    } else {
      setError(data.error || 'Failed to attach invoice');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{error || 'Order not found'}</p>
        <button
          onClick={() => router.push('/portal/vendor/orders')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const isPending = order.status === 'PENDING' || order.status === 'PARTIALLY_DELIVERED';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/portal/vendor/orders')}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">{order.poNumber}</h1>
          <span
            className={`px-2 py-1 text-xs rounded-full text-white ${
              STATUS_COLORS[order.status] || 'bg-gray-500'
            }`}
          >
            {order.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <div>
          <p className="text-xs font-medium text-blue-700 uppercase">Deliver To</p>
          <p className="text-xl font-bold text-blue-900">
            {CLINIC_NAMES[order.clinicId] || order.clinicId}
          </p>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-xs font-medium text-blue-700 uppercase">Expected Delivery</p>
          <p className="text-lg font-semibold text-blue-900">
            {order.expectedDeliveryDate
              ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN')
              : 'Not set'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <p className="text-sm text-gray-500">Order Date</p>
        <p className="font-medium">{new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
        <p className="text-sm text-gray-500 mt-2">Order Total</p>
        <p className="text-xl font-bold">₹{Number(order.netAmount).toLocaleString('en-IN')}</p>
        {order.notes && (
          <>
            <p className="text-sm text-gray-500 mt-2">Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold">Line Items</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {order.lineItems.map((li) => (
              <tr key={li.itemId}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {li.itemName}
                  <p className="text-xs text-gray-500">{li.category}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{li.quantityOrdered}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{li.quantityDelivered}</td>
                <td className="px-6 py-4 text-sm">₹{Number(li.unitPrice).toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  ₹{Number(li.totalPrice).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.invoiceFileId && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <span className="text-sm">Invoice uploaded</span>
          <a
            href={order.invoiceFileId}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View Invoice
          </a>
        </div>
      )}

      {isPending && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" /> Update Delivery
          </h2>
          <form onSubmit={updateDelivery} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {order.lineItems.map((li) => (
                <div key={li.itemId} className="flex items-center gap-2 bg-gray-50 rounded-md p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{li.itemName}</p>
                    <p className="text-xs text-gray-500">
                      Ordered: {li.quantityOrdered} {li.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max={li.quantityOrdered}
                      value={deliveredQty[li.itemId] ?? 0}
                      onChange={(e) =>
                        setDeliveredQty((prev) => ({
                          ...prev,
                          [li.itemId]: Math.min(
                            Number(e.target.value),
                            li.quantityOrdered
                          ),
                        }))
                      }
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">/ {li.quantityOrdered}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Package className="h-4 w-4" /> {saving ? 'Saving...' : 'Update Delivery'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mt-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" /> Invoice
        </h2>
        <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer inline-flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload Invoice
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleInvoiceUpload(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
