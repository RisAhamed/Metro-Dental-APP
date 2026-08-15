'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

interface SurgeryType {
  id: string;
  name: string;
  isActive: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function SurgeryTypeManager() {
  const [items, setItems] = useState<SurgeryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/surgery-types');
        const data = await res.json();
        if (!cancelled) setItems(data.records || []);
      } catch (error) {
        console.error('Error loading surgery types:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadItems = async () => {
    const res = await fetch('/api/surgery-types');
    const data = await res.json();
    setItems(data.records || []);
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const id = `surgery_${slugify(name)}`;
      const res = await fetch('/api/surgery-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: name.trim() }),
      });
      if (res.ok) {
        setName('');
        await loadItems();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add surgery type');
      }
    } catch (error) {
      console.error('Error adding surgery type:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: SurgeryType) => {
    const res = await fetch('/api/surgery-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    if (res.ok) await loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this surgery type?')) return;
    const res = await fetch(`/api/surgery-types?id=${id}`, { method: 'DELETE' });
    if (res.ok) await loadItems();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900">Surgery Types</h2>
      <p className="text-sm text-gray-600 mt-1">
        Performed by the Chief Doctor (SUPER_ADMIN). Any doctor can refer a patient; when a
        surgery completes with revenue &#8805; &#8377;20,000, the referring doctor gets a
        &#8377;1,500 incentive.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New surgery type name"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No surgery types yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(item)}
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={loadItems}
        className="mt-4 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </button>
    </div>
  );
}