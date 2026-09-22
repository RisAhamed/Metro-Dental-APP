'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SummaryPurchase { purchaseId: string; purchaseNumber: string; purchaseDate: string; totalAmount?: string; amountPaid?: string; balanceDue?: string; paymentStatus?: string; }

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const canSee = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const [data, setData] = useState<{ vendor: { name: string }; totalPurchased?: number; totalPaid?: number; outstanding?: number; purchases: SummaryPurchase[] } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/vendors/${vendorId}/summary`)
      .then((r) => r.json())
      .then((d) => { if (active && !d.error) setData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, [vendorId]);

  if (!data) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/inventory/vendors" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Back to Vendors</Link>
      <h1 className="text-2xl font-bold mb-4">Vendor: {data.vendor.name}</h1>
      {canSee && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 uppercase">Total Purchased</p><p className="text-xl font-bold">₹{Number(data.totalPurchased || 0).toLocaleString('en-IN')}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 uppercase">Total Paid</p><p className="text-xl font-bold text-green-600">₹{Number(data.totalPaid || 0).toLocaleString('en-IN')}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 uppercase">Outstanding</p><p className="text-xl font-bold text-red-600">₹{Number(data.outstanding || 0).toLocaleString('en-IN')}</p></div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-semibold p-4 border-b">Recent Purchases</h2>
        {data.purchases.map((p) => (
          <Link key={p.purchaseId} href={`/inventory/purchases/${p.purchaseId}`} className="flex justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50 text-sm">
            <span>{p.purchaseNumber} • {new Date(p.purchaseDate).toLocaleDateString('en-IN')}</span>
            {canSee && <span>₹{Number(p.totalAmount || 0).toFixed(0)} • Paid ₹{Number(p.amountPaid || 0).toFixed(0)} • {p.paymentStatus}</span>}
          </Link>
        ))}
        {data.purchases.length === 0 && <p className="p-4 text-sm text-gray-400">No purchases yet.</p>}
      </div>
    </div>
  );
}
