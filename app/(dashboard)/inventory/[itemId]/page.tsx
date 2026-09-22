'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ItemDetail {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityInStock: number;
  unitPrice?: string | null;
  vendorId?: string | null;
  purchaseId?: string | null;
  lastPurchasePrice?: string | null;
  lastPurchaseDate?: string | null;
}
interface HistRow { purchaseId: string; purchaseNumber: string; purchaseDate: string; vendorName: string; quantity: number; unitPrice: number; totalPrice: number; paymentStatus?: string; balanceDue?: string; }

export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.itemId as string;
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const isSuper = role === 'SUPER_ADMIN';
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [vendorName, setVendorName] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [itemRes, purRes] = await Promise.all([
          fetch(`/api/inventory/${itemId}`),
          fetch(`/api/purchases?limit=200`),
        ]);
        const itemData = await itemRes.json();
        const purData = await purRes.json();
        if (!active) return;
        const it = itemData.item || itemData;
        setItem(it);
        if (it?.vendorId) {
          fetch(`/api/vendors/${it.vendorId}/summary`).then((r) => r.json()).then((d) => { if (active && d.vendor) setVendorName(d.vendor.name); }).catch(() => {});
        }
        const rows: HistRow[] = [];
        for (const p of (purData.purchases || []) as Array<{ purchaseId: string; purchaseNumber: string; purchaseDate: string; vendorName: string; lineItems?: Array<{ itemId: string; quantity: number; unitPrice: number; totalPrice: number }>; paymentStatus?: string; balanceDue?: string }>) {
          const li = (p.lineItems || []).find((x) => x.itemId === itemId);
          if (li) rows.push({ purchaseId: p.purchaseId, purchaseNumber: p.purchaseNumber, purchaseDate: p.purchaseDate, vendorName: p.vendorName, quantity: li.quantity, unitPrice: li.unitPrice, totalPrice: li.totalPrice, paymentStatus: p.paymentStatus, balanceDue: p.balanceDue });
        }
        rows.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setHistory(rows);
      } catch {}
    };
    load();
    return () => { active = false; };
  }, [itemId]);

  if (!item) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/inventory" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back to Inventory</Link>
      <h1 className="text-2xl font-bold">{item.name}</h1>
      <p className="text-sm text-gray-500 mb-4">{item.category} • Unit: {item.unit} • Stock: {item.quantityInStock}</p>
      <div className="bg-white rounded-lg shadow p-6 mb-6 text-sm space-y-1">
        <div className="flex justify-between"><span>Last purchase price</span><span className="font-medium">{item.lastPurchasePrice ? `₹${Number(item.lastPurchasePrice).toFixed(2)}` : '—'}</span></div>
        <div className="flex justify-between"><span>Last vendor</span><span>{vendorName || item.vendorId || '—'}</span></div>
        <div className="flex justify-between"><span>Last purchase date</span><span>{item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString('en-IN') : '—'}</span></div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Purchase History</h2>
        {history.length === 0 ? <p className="text-sm text-gray-400">No purchases found for this item.</p> : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Date</th><th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Vendor</th><th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Unit Price</th><th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Total</th>{isSuper && <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Payment</th>}</tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={`${h.purchaseId}-${h.quantity}`} className="border-t">
                  <td className="px-3 py-2">{new Date(h.purchaseDate).toLocaleDateString('en-IN')} ({h.purchaseNumber})</td>
                  <td className="px-3 py-2">{h.vendorName}</td>
                  <td className="px-3 py-2 text-right">{h.quantity}</td>
                  <td className="px-3 py-2 text-right">₹{Number(h.unitPrice).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{Number(h.totalPrice).toFixed(2)}</td>
                  {isSuper && <td className="px-3 py-2">{h.paymentStatus || '—'}{h.balanceDue ? ` (₹${Number(h.balanceDue).toFixed(0)} due)` : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
