'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Package, AlertCircle, Edit3, Link2, Truck, Building2, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clinics, clinicName } from '@/lib/constants/clinics';

interface InventoryItem {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: string;
  clinicId: string;
  createdByName: string | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string; unit: string }[]>([]);
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
  }, [search, categoryFilter, clinicFilter, isSuperAdmin]);

  const lowStockCount = items.filter((i) => i.quantityInStock <= i.reorderLevel).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Link
                href="/inventory/vendors"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Truck className="h-4 w-4" /> Vendors
              </Link>
              <Link
                href="/inventory/purchase-orders"
                className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" /> Purchase Orders
              </Link>
            </>
          )}
          <Link
            href="/inventory/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Link>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            {lowStockCount} item{lowStockCount > 1 ? 's' : ''} at or below reorder level
          </span>
        </div>
      )}

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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p>No inventory items found</p>
          <Link href="/inventory/new" className="text-blue-600 hover:underline">
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const lowStock = item.quantityInStock <= item.reorderLevel;
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
                      lowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
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
                </div>
                {lowStock && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Low stock! Reorder level: {item.reorderLevel}
                  </div>
                )}
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`/inventory/${item.itemId}/edit`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> {isAdmin ? 'Edit' : 'Take Out / Edit'}
                  </Link>
                  {isAdmin && (
                    <Link
                      href={`/inventory/purchase-orders/new?itemId=${item.itemId}`}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Reorder
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
