'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Plus, ShoppingCart, ArrowLeft, Search } from 'lucide-react';

interface Purchase {
  purchaseId: string;
  purchaseNumber: string;
  vendorName: string;
  vendorId: string;
  purchaseDate: string;
  invoiceNumber?: string | null;
  lineItems?: Array<{ itemName: string }>;
  totalAmount?: string;
  balanceDue?: string;
  paymentStatus?: string;
}

interface Vendor { vendorId: string; name: string; }
interface Suggestions { vendors: Vendor[]; products: Array<{ itemName: string; purchaseCount: number }>; purchases: Array<{ purchaseId: string; purchaseNumber: string; vendorName: string }>; }

function useDebounce(value: string, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function PurchasesPage() {
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (sessionClaims?.role as string) || '';
  const canSeeFinancials = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/vendors?active=true').then((r) => r.json()).then((d) => setVendors(d.vendors || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (vendorId) params.set('vendorId', vendorId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status !== 'all') params.set('status', status);
    if (sort !== 'newest') params.set('sort', sort);
    router.replace(`/inventory/purchases?${params.toString()}`, { scroll: false });
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (debouncedSearch) q.set('search', debouncedSearch);
        if (vendorId) q.set('vendorId', vendorId);
        if (from) q.set('from', from);
        if (to) q.set('to', to);
        if (status !== 'all') q.set('paymentStatus', status);
        q.set('sort', sort);
        const res = await fetch(`/api/purchases?${q.toString()}`);
        const data = await res.json();
        if (!cancelled) setPurchases(data.purchases || []);
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, vendorId, from, to, status, sort]);

  useEffect(() => {
    let active = true;
    if (!debouncedSearch || debouncedSearch.length < 2) return () => { active = false; };
    fetch(`/api/purchases/search-suggestions?q=${encodeURIComponent(debouncedSearch)}`)
      .then((r) => r.json())
      .then((d) => { if (active) { setSuggestions(d); setShowSuggest(true); } })
      .catch(() => {});
    return () => { active = false; };
  }, [debouncedSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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

      <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]" ref={boxRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              placeholder="Search: product, vendor, amount..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            {showSuggest && suggestions && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto text-sm">
                {suggestions.vendors.map((v) => (
                  <button key={v.vendorId} onClick={() => { setVendorId(v.vendorId); setSearch(v.name); setShowSuggest(false); }} className="block w-full text-left px-3 py-2 hover:bg-gray-50">
                    Vendor: <span className="font-medium">{v.name}</span>
                  </button>
                ))}
                {suggestions.products.map((p) => (
                  <button key={p.itemName} onClick={() => { setSearch(p.itemName); setShowSuggest(false); }} className="block w-full text-left px-3 py-2 hover:bg-gray-50">
                    Product: <span className="font-medium">{p.itemName}</span> <span className="text-gray-400">({p.purchaseCount})</span>
                  </button>
                ))}
                {suggestions.purchases.map((p) => (
                  <button key={p.purchaseId} onClick={() => { setSearch(p.purchaseNumber); setShowSuggest(false); }} className="block w-full text-left px-3 py-2 hover:bg-gray-50">
                    {p.purchaseNumber} — <span className="text-gray-500">{p.vendorName}</span>
                  </button>
                ))}
                {suggestions.vendors.length === 0 && suggestions.products.length === 0 && suggestions.purchases.length === 0 && (
                  <p className="px-3 py-2 text-gray-400">No matches</p>
                )}
              </div>
            )}
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
          <span className="text-sm text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="border rounded-md px-2 py-2 text-sm">
            <option value="">All Vendors</option>
            {vendors.map((v) => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Payment:</span>
          {[['all', 'All'], ['UNPAID', 'Unpaid'], ['PARTIALLY_PAID', 'Partial'], ['PAID', 'Paid']].map(([k, label]) => (
            <button key={k} onClick={() => setStatus(k)} className={`px-2.5 py-1 text-xs rounded-md ${status === k ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{label}</button>
          ))}
          <span className="text-xs text-gray-500 ml-3">Sort:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-md px-2 py-1 text-xs">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
          <button onClick={() => { setSearch(''); setVendorId(''); setFrom(''); setTo(''); setStatus('all'); setSort('newest'); }} className="text-xs text-gray-500 hover:underline ml-2">Clear</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No purchases found</p>
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
