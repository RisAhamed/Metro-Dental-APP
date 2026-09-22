'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit3, Link2, Truck, Building2, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clinics, clinicName } from '@/lib/constants/clinics';

interface InventoryItem {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityInStock: number;
  unitPrice: string;
  clinicId: string;
  vendorId?: string | null;
  purchaseId?: string | null;
  lastPurchasePrice?: string | null;
  lastPurchaseDate?: string | null;
  createdByName: string | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [vendors, setVendors] = useState<Array<{ vendorId: string; name: string }>>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const meRes = await fetch('/api/users/me');
        const meData = await meRes.json();
        const role = meData?.user?.role || '';
        if (!cancelled) {
          setIsSuperAdmin(role === 'SUPER_ADMIN');
          setIsAdmin(['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role));
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/inventory/categories');
        const data = await res.json();
        if (!cancelled) setCategories(data.categories || []);
        const vRes = await fetch('/api/vendors?active=true');
        const vData = await vRes.json();
        if (!cancelled) setVendors(vData.vendors || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (vendorFilter !== 'all') params.set('vendorId', vendorFilter);
        if (isSuperAdmin && clinicFilter !== 'all') params.set('clinicId', clinicFilter);
        const res = await fetch(`/api/inventory?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItems();
    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, vendorFilter, clinicFilter, isSuperAdmin]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Link
                href="/inventory/purchases/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> + Record Purchase
              </Link>
              <Link
                href="/inventory/vendors"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Truck className="h-4 w-4" /> Vendors
              </Link>
              <Link
                href="/inventory/purchases"
                className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" /> Purchases
              </Link>
            </>
          )}
          {!isAdmin && (
            <Link
              href="/inventory/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> + Record Purchase
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          {isSuperAdmin && (
            <select
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Clinics</option>
              {clinics.map((c) => (
                <option key={c.clinicId} value={c.clinicId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.vendorId} value={v.vendorId}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No inventory items found</p>
          <Link href="/inventory/new" className="text-blue-600 hover:underline">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            return (
              <div key={item.itemId} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                    <p className="text-sm text-gray-500">Unit: {item.unit}</p>
                    {isAdmin && (
                      <p className="text-sm text-gray-700 mt-1">
                        ₹{Number(item.unitPrice || 0).toLocaleString('en-IN')} / {item.unit}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      item.quantityInStock <= 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {item.quantityInStock} in stock
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {clinicName(item.clinicId)}
                  </span>
                  {item.createdByName && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1">
                      <UserCircle2 className="h-3 w-3" /> Added by {item.createdByName}
                    </span>
                  )}
                  {item.lastPurchasePrice && (
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      Last: ₹{Number(item.lastPurchasePrice).toLocaleString('en-IN')}{item.lastPurchaseDate ? ` • ${new Date(item.lastPurchaseDate).toLocaleDateString('en-IN')}` : ''}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`/inventory/${item.itemId}`}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    View
                  </Link>
                  {isAdmin && (
                    <Link
                      href={`/inventory/${item.itemId}/edit`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" /> {isAdmin ? 'Edit' : 'Take Out / Edit'}
                    </Link>
                  )}
                  {!isAdmin && (
                    <Link href="/inventory/new" className="text-sm text-blue-600 hover:underline">
                      Manage Catalog
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
