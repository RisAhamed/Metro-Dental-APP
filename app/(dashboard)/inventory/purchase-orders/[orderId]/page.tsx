'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, X, Package } from 'lucide-react';

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

interface Return {
  returnId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  amount: number;
  date: string;
}

interface Payment {
  paymentId: string;
  amount: number;
  date: string;
  method: string;
  notes: string | null;
}

interface PurchaseOrder {
  orderId: string;
  poNumber: string;
  vendorName: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  deliveredDate: string | null;
  status: string;
  lineItems: LineItem[];
  returns: Return[];
  invoiceFileId: string | null;
  totalOrderAmount: string;
  totalReturnAmount: string;
  netAmount: string;
  amountPaid: string;
  balanceDue: string;
  paymentStatus: string;
  paymentHistory: Payment[];
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PARTIALLY_DELIVERED: 'bg-blue-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // delivery state
  const [deliveredQty, setDeliveredQty] = useState<Record<string, number>>({});
  // return state
  const [showReturn, setShowReturn] = useState(false);
  const [returnForm, setReturnForm] = useState({ itemId: '', itemName: '', quantity: '', reason: '' });
  // payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'CASH', notes: '' });

  const isClinicAdmin = (sessionClaims?.role as string) === 'CLINIC_ADMIN' || (sessionClaims?.role as string) === 'SUPER_ADMIN';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { orderId } = await params;
        const res = await fetch(`/api/purchase-orders/${orderId}`);
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

  const refresh = async () => {
    const { orderId } = await params;
    const res = await fetch(`/api/purchase-orders/${orderId}`);
    const data = await res.json();
    if (data.order) setOrder(data.order);
  };

  const confirmDelivery = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const items = order.lineItems.map((li) => ({
      ...li,
      quantityDelivered: deliveredQty[li.itemId] || 0,
    }));
    const res = await fetch(`/api/purchase-orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-delivery', lineItems: items, status: 'DELIVERED' }),
    });
    const data = await res.json();
    if (res.ok) {
      await refresh();
    } else {
      setError(data.error || 'Failed to confirm delivery');
    }
  };

  const addReturn = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const res = await fetch(`/api/purchase-orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-return',
        itemId: returnForm.itemId,
        itemName: returnForm.itemName,
        quantity: Number(returnForm.quantity),
        reason: returnForm.reason,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowReturn(false);
      setReturnForm({ itemId: '', itemName: '', quantity: '', reason: '' });
      await refresh();
    } else {
      setError(data.error || 'Failed to add return');
    }
  };

  const recordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const res = await fetch(`/api/purchase-orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record-payment',
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        notes: paymentForm.notes,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowPayment(false);
      setPaymentForm({ amount: '', method: 'CASH', notes: '' });
      await refresh();
    } else {
      setError(data.error || 'Failed to record payment');
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm('Cancel this purchase order?')) return;
    const res = await fetch(`/api/purchase-orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    if (res.ok) await refresh();
  };

  const handleInvoiceUpload = async (file: File) => {
    if (!order) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/invoice', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.fileId) {
      setError(data.error || 'Upload failed');
      return;
    }
    const res2 = await fetch(`/api/purchase-orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm-delivery',
        lineItems: order.lineItems,
        status: order.status,
        invoiceFileId: data.fileId,
      }),
    });
    if (res2.ok) {
      setError('');
      await refresh();
    } else {
      setError('Failed to attach invoice to order');
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
          onClick={() => router.push('/inventory/purchase-orders')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  const canConfirm = order.status === 'PENDING' || order.status === 'PARTIALLY_DELIVERED';
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/inventory/purchase-orders')}
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
        {order.status !== 'CANCELLED' && !isDelivered && (
          <button
            onClick={cancelOrder}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100"
          >
            Cancel Order
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Vendor</p>
          <p className="font-semibold">{order.vendorName}</p>
          <p className="text-sm text-gray-500 mt-2">Order Date</p>
          <p className="font-medium">{new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
          {order.expectedDeliveryDate && (
            <>
              <p className="text-sm text-gray-500 mt-2">Expected Delivery</p>
              <p className="font-medium">
                {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN')}
              </p>
            </>
          )}
          {order.deliveredDate && (
            <>
              <p className="text-sm text-gray-500 mt-2">Delivered</p>
              <p className="font-medium">{new Date(order.deliveredDate).toLocaleDateString('en-IN')}</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Order Total</p>
          <p className="text-xl font-bold">₹{Number(order.totalOrderAmount).toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-2">Returns</p>
          <p className="text-red-600 font-medium">
            -₹{Number(order.totalReturnAmount).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-gray-500 mt-2">Net Amount</p>
          <p className="text-xl font-bold text-blue-600">
            ₹{Number(order.netAmount).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-xl font-bold text-green-600">
            ₹{Number(order.amountPaid).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-gray-500 mt-2">Balance Due</p>
          <p className="text-xl font-bold text-red-600">
            ₹{Number(order.balanceDue).toLocaleString('en-IN')}
          </p>
          <span
            className={`mt-2 inline-block px-2 py-1 text-xs rounded-full ${
              order.paymentStatus === 'PAID'
                ? 'bg-green-100 text-green-800'
                : order.paymentStatus === 'PARTIALLY_PAID'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Line Items</h2>
          {order.status !== 'CANCELLED' && (
            <button
              onClick={() => {
                const item = order.lineItems[0];
                setReturnForm({
                  itemId: item?.itemId || '',
                  itemName: item?.itemName || '',
                  quantity: '',
                  reason: '',
                });
                setShowReturn(true);
              }}
              className="px-3 py-1.5 text-sm bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100"
            >
              Add Return
            </button>
          )}
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Ordered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Delivered</th>
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

      {order.returns.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold">Returns</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.returns.map((r) => (
                <tr key={r.returnId}>
                  <td className="px-6 py-4 text-sm text-gray-900">{r.itemName}</td>
                  <td className="px-6 py-4 text-sm">{r.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.reason}</td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    -₹{Number(r.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(r.date).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {order.paymentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold">Payment History</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.paymentHistory.map((p) => (
                <tr key={p.paymentId}>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(p.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{p.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {isClinicAdmin && order.status !== 'CANCELLED' && (
        <div className="bg-white rounded-lg shadow p-6 mb-4 space-y-4">
          <h2 className="font-semibold">Clinic Actions</h2>
          {canConfirm && (
            <form onSubmit={confirmDelivery} className="space-y-3">
              <p className="text-sm text-gray-600">Confirm delivered quantities (updates stock):</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {order.lineItems.map((li) => (
                  <div key={li.itemId} className="flex items-center gap-2">
                    <span className="text-sm flex-1">{li.itemName}</span>
                    <input
                      type="number"
                      min="0"
                      max={li.quantityOrdered}
                      value={deliveredQty[li.itemId] ?? 0}
                      onChange={(e) =>
                        setDeliveredQty((prev) => ({
                          ...prev,
                          [li.itemId]: Number(e.target.value),
                        }))
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">/ {li.quantityOrdered}</span>
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Package className="h-4 w-4" /> Confirm Delivery & Update Stock
              </button>
            </form>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowPayment(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Record Payment
            </button>
            <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer flex items-center gap-2">
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
      )}

      {showReturn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Return</h3>
              <button onClick={() => setShowReturn(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={addReturn} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                <select
                  value={returnForm.itemId}
                  onChange={(e) => {
                    const li = order.lineItems.find((i) => i.itemId === e.target.value);
                    setReturnForm({ ...returnForm, itemId: e.target.value, itemName: li?.itemName || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select item</option>
                  {order.lineItems.map((li) => (
                    <option key={li.itemId} value={li.itemId}>
                      {li.itemName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Damaged, wrong item, etc."
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Add Return
              </button>
            </form>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Payment</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Balance due: ₹{Number(order.balanceDue).toLocaleString('en-IN')}
            </p>
            <form onSubmit={recordPayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
