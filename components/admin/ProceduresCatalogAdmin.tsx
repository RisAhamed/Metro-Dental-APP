'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { Plus, Pencil, X, Trash2 } from 'lucide-react';

interface CatalogProcedure {
  id: string;
  name: string;
  defaultCost: string;
  isActive: boolean;
  clinicId: string | null;
}

export function ProceduresCatalogAdmin() {
  const [items, setItems] = useState<CatalogProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CatalogProcedure | null>(null);
  const [formName, setFormName] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procedures-catalog?limit=100&includeInactive=true');
      const data = await res.json();
      setItems(data.procedures || []);
    } catch (error) {
      console.error('Load procedures error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormCost('0');
    setShowModal(true);
  };

  const openEdit = (item: CatalogProcedure) => {
    setEditing(item);
    setFormName(item.name);
    setFormCost(item.defaultCost);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Procedure name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch('/api/procedures-catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: formName.trim(), defaultCost: formCost }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to update');
        }
      } else {
        const res = await fetch('/api/procedures-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), defaultCost: formCost }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to create');
        }
      }
      setShowModal(false);
      await load();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: CatalogProcedure) => {
    const res = await fetch('/api/procedures-catalog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    if (res.ok) await load();
  };

  const handleDelete = async (item: CatalogProcedure) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    const res = await fetch(`/api/procedures-catalog?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Procedures Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Manage procedures available for treatment plans.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Procedure
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter procedures..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <p>No procedures found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">₹{Number(item.defaultCost || 0).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`px-2 py-1 text-xs rounded-full ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3" title="Edit">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700" title="Deactivate">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g. RCT, Crown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Procedure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
