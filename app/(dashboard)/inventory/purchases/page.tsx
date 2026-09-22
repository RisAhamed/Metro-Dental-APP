'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Plus, ShoppingCart, ArrowLeft } from 'lucide-react';

interface Purchase {
  purchaseId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  totalAmount?: string;
  balanceDue?: string;
  paymentStatus?: string;
}

export default function PurchasesPage() {
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.role as string) || '';
  const canSeeFinancials = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/purchases');
        const data = await res.json();
        if (!cancelled) setPurchases(data.purchases || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold">Purchases</h1>
        </div>
        <Link href="/inventory/purchases/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Purchase
        </Link>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No purchases recorded</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                {canSeeFinancials && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.map((p) => (
                <tr key={p.purchaseId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/inventory/purchases/${p.purchaseId}`} className="text-blue-600 hover:underline">{p.purchaseNumber}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{p.vendorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                  {canSeeFinancials && (
                    <>
                      <td className="px-6 py-4 text-sm">₹{Number(p.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-sm">₹{Number(p.balanceDue || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-sm">{p.paymentStatus}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
